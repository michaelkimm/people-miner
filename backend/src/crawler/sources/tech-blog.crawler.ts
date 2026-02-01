import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GithubService } from '../../github/github.service';
import { SourceType } from '@prisma/client';
import { spawn } from 'child_process';
import * as path from 'path';

/**
 * Author data from the Python crawler
 */
interface BlogAuthor {
  name: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  github_url?: string;
  company?: string;
  job_title?: string;
  team?: string;
  is_team?: boolean;
  posts: Array<{
    title: string;
    url: string;
    published_date?: string;
  }>;
}

/**
 * Response from the Python crawler
 */
interface CrawlAuthorsResponse {
  blog: string;
  company: string;
  authors_count: number;
  posts_count: number;
  authors: BlogAuthor[];
}

/**
 * Tech Blog Crawler
 *
 * Integrates with the Python korean-blog-crawler to extract
 * author information from tech company blogs.
 *
 * Flow:
 * 1. Call Python CLI to crawl blog and extract authors
 * 2. For each author with a GitHub URL, fetch GitHub profile
 * 3. Create candidate from GitHub data, linked to tech blog source
 */
@Injectable()
export class TechBlogCrawler {
  private readonly logger = new Logger(TechBlogCrawler.name);
  private readonly pythonCrawlerPath: string;

  constructor(
    private prisma: PrismaService,
    private githubService: GithubService,
  ) {
    this.pythonCrawlerPath = path.resolve(
      __dirname,
      '../../../../../korean-blog-crawler',
    );
  }

  /**
   * Main crawl method for tech blogs
   * @param blogKey - Blog identifier (e.g., 'woowahan', 'kakao', 'toss')
   * @param sourceName - Name for the source record
   */
  async crawl(
    blogKey: string,
    sourceName: string,
  ): Promise<{ found: number; new: number }> {
    this.logger.log(`Crawling tech blog: ${blogKey}`);

    try {
      // Call Python crawler to get authors
      const crawlResult = await this.runPythonCrawler(blogKey);

      if (!crawlResult || crawlResult.authors_count === 0) {
        this.logger.warn(`No authors found for ${blogKey}`);
        return { found: 0, new: 0 };
      }

      this.logger.log(
        `Found ${crawlResult.authors_count} authors from ${crawlResult.blog}`,
      );

      let newCount = 0;

      // Process each author
      for (const author of crawlResult.authors) {
        try {
          const created = await this.processAuthor(
            author,
            sourceName,
            crawlResult.company,
          );
          if (created) {
            newCount++;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to process author ${author.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log(
        `Completed crawling ${blogKey}: ${crawlResult.authors_count} found, ${newCount} new`,
      );

      return { found: crawlResult.authors_count, new: newCount };
    } catch (error) {
      this.logger.error(`Failed to crawl ${blogKey}:`, error);
      throw error;
    }
  }

  /**
   * Run the Python crawler CLI and parse JSON output
   */
  private async runPythonCrawler(
    blogKey: string,
  ): Promise<CrawlAuthorsResponse | null> {
    return new Promise((resolve, reject) => {
      const pythonPath = path.join(this.pythonCrawlerPath, 'venv/bin/python');
      const cliPath = path.join(this.pythonCrawlerPath, 'cli.py');

      this.logger.debug(`Running: ${pythonPath} ${cliPath} authors ${blogKey}`);

      const process = spawn(pythonPath, [cliPath, 'authors', blogKey, '--limit', '100'], {
        cwd: this.pythonCrawlerPath,
        env: {
          ...globalThis.process.env,
          PYTHONPATH: this.pythonCrawlerPath,
        },
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`Python crawler failed with code ${code}: ${stderr}`);
          reject(new Error(`Python crawler failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout) as CrawlAuthorsResponse;
          resolve(result);
        } catch (parseError) {
          this.logger.error(`Failed to parse crawler output: ${stdout}`);
          reject(new Error('Failed to parse crawler output'));
        }
      });

      process.on('error', (error) => {
        this.logger.error('Failed to spawn Python process:', error);
        reject(error);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        process.kill();
        reject(new Error('Python crawler timed out'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Process a single author from the blog
   * Attempts to find their GitHub profile and create a candidate
   */
  private async processAuthor(
    author: BlogAuthor,
    sourceName: string,
    company: string,
  ): Promise<boolean> {
    // Skip team accounts
    if (author.is_team) {
      this.logger.debug(`Skipping team account: ${author.name}`);
      return false;
    }

    // Try to find GitHub username
    let githubUsername = this.extractGithubUsername(author.github_url);

    // If no GitHub URL, try to search by name and company
    if (!githubUsername && author.name) {
      githubUsername = await this.searchGithubUser(author.name, company);
    }

    if (!githubUsername) {
      this.logger.debug(
        `No GitHub profile found for ${author.name}, skipping`,
      );
      return false;
    }

    // Check if candidate already exists
    const existingCandidate = await this.prisma.candidate.findUnique({
      where: { githubUsername },
    });

    if (existingCandidate) {
      // Add source if not already linked
      await this.ensureSourceExists(existingCandidate.id, sourceName, company);
      return false;
    }

    // Fetch GitHub user details
    const userDetails = await this.githubService.getUser(githubUsername);
    if (!userDetails) {
      this.logger.debug(`Could not fetch GitHub user: ${githubUsername}`);
      return false;
    }

    // Fetch repositories
    const repos = await this.githubService.getUserRepos(githubUsername, 10);

    // Calculate lastActivityAt from repo pushed_at dates
    const lastActivityAt = repos
      .filter((r) => r.pushed_at)
      .map((r) => new Date(r.pushed_at!))
      .sort((a, b) => b.getTime() - a.getTime())[0] || null;

    // Create candidate with tech blog source
    const candidate = await this.prisma.candidate.create({
      data: {
        githubUsername: userDetails.login,
        githubId: userDetails.id,
        name: userDetails.name || author.name,
        email: userDetails.email || author.email,
        bio: userDetails.bio || author.bio,
        company: userDetails.company || company,
        location: userDetails.location,
        blog: userDetails.blog,
        avatarUrl: userDetails.avatar_url || author.avatar_url,
        publicRepos: userDetails.public_repos,
        followers: userDetails.followers,
        following: userDetails.following,
        lastActivityAt,
        sources: {
          create: {
            sourceType: SourceType.TECH_BLOG,
            sourceName,
            sourceUrl: author.posts[0]?.url || `https://techblog.${company.toLowerCase()}.com`,
          },
        },
        repositories: {
          create: repos.map((repo) => ({
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            language: repo.language,
            starCount: repo.stargazers_count,
            forkCount: repo.forks_count,
            url: repo.html_url,
            pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
          })),
        },
      },
    });

    this.logger.debug(`Created candidate from tech blog: ${candidate.githubUsername}`);
    return true;
  }

  /**
   * Extract GitHub username from URL
   */
  private extractGithubUsername(url?: string): string | null {
    if (!url) return null;

    const match = url.match(/github\.com\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Search for GitHub user by name and company
   */
  private async searchGithubUser(
    name: string,
    company: string,
  ): Promise<string | null> {
    try {
      // Try searching with name + company
      const query = `${name} ${company}`;
      const results = await this.githubService.searchUsers(query, 1);

      if (results && results.length > 0) {
        return results[0].login;
      }

      // Try with just name
      const nameOnlyResults = await this.githubService.searchUsers(name, 1);
      if (nameOnlyResults && nameOnlyResults.length > 0) {
        return nameOnlyResults[0].login;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Ensure the source is linked to an existing candidate
   */
  private async ensureSourceExists(
    candidateId: string,
    sourceName: string,
    company: string,
  ): Promise<void> {
    const existingSource = await this.prisma.candidateSource.findUnique({
      where: {
        candidateId_sourceType_sourceName: {
          candidateId,
          sourceType: SourceType.TECH_BLOG,
          sourceName,
        },
      },
    });

    if (!existingSource) {
      await this.prisma.candidateSource.create({
        data: {
          candidateId,
          sourceType: SourceType.TECH_BLOG,
          sourceName,
          sourceUrl: `https://techblog.${company.toLowerCase()}.com`,
        },
      });
    }
  }
}
