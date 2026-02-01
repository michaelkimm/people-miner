package events

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// JobProgress represents progress of a crawl job
type JobProgress struct {
	JobID    string `json:"jobId"`
	Source   string `json:"source,omitempty"`
	Status   string `json:"status"`
	Message  string `json:"message,omitempty"`
	Found    int    `json:"found,omitempty"`
	NewCount int    `json:"newCount,omitempty"`
	Error    string `json:"error,omitempty"`
}

// Message represents a WebSocket message
type Message struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

// Client represents a WebSocket client
type Client struct {
	gateway *EventsGateway
	conn    *websocket.Conn
	send    chan []byte
}

// EventsGateway manages WebSocket connections
type EventsGateway struct {
	clients    map[*Client]bool
	broadcast  chan Message
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// NewEventsGateway creates a new EventsGateway
func NewEventsGateway() *EventsGateway {
	return &EventsGateway{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan Message, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the gateway event loop
func (g *EventsGateway) Run() {
	for {
		select {
		case client := <-g.register:
			g.mu.Lock()
			g.clients[client] = true
			g.mu.Unlock()
			log.Printf("Client connected. Total clients: %d", len(g.clients))

		case client := <-g.unregister:
			g.mu.Lock()
			if _, ok := g.clients[client]; ok {
				delete(g.clients, client)
				close(client.send)
			}
			g.mu.Unlock()
			log.Printf("Client disconnected. Total clients: %d", len(g.clients))

		case message := <-g.broadcast:
			data, err := json.Marshal(message)
			if err != nil {
				log.Printf("Error marshaling message: %v", err)
				continue
			}

			g.mu.RLock()
			for client := range g.clients {
				select {
				case client.send <- data:
				default:
					close(client.send)
					delete(g.clients, client)
				}
			}
			g.mu.RUnlock()
		}
	}
}

// HandleWebSocket handles WebSocket connections
func (g *EventsGateway) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		gateway: g,
		conn:    conn,
		send:    make(chan []byte, 256),
	}

	g.register <- client

	go client.writePump()
	go client.readPump()
}

// BroadcastMessage broadcasts a message to all clients
func (g *EventsGateway) BroadcastMessage(msg Message) {
	select {
	case g.broadcast <- msg:
	default:
		log.Println("Broadcast channel full, dropping message")
	}
}

// SendProgress sends a job progress update
func (g *EventsGateway) SendProgress(progress JobProgress) {
	g.BroadcastMessage(Message{
		Event: "crawl:progress",
		Data:  progress,
	})
}

func (c *Client) readPump() {
	defer func() {
		c.gateway.unregister <- c
		c.conn.Close()
	}()

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

func (c *Client) writePump() {
	defer func() {
		c.conn.Close()
	}()

	for message := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}
