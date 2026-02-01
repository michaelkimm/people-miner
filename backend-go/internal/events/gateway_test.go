package events

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestJobProgress_Fields(t *testing.T) {
	progress := &JobProgress{
		JobID:    "job-123",
		Source:   "test-source",
		Status:   "processing",
		Message:  "Processing source",
		Found:    100,
		NewCount: 50,
		Error:    "",
	}

	assert.Equal(t, "job-123", progress.JobID)
	assert.Equal(t, "test-source", progress.Source)
	assert.Equal(t, "processing", progress.Status)
	assert.Equal(t, 100, progress.Found)
	assert.Equal(t, 50, progress.NewCount)
}

func TestJobProgress_WithError(t *testing.T) {
	progress := &JobProgress{
		JobID:   "job-123",
		Source:  "failed-source",
		Status:  "error",
		Message: "Failed to process",
		Error:   "connection timeout",
	}

	assert.Equal(t, "error", progress.Status)
	assert.Equal(t, "connection timeout", progress.Error)
}

func TestEventsGateway_NewGateway(t *testing.T) {
	gateway := NewEventsGateway()

	assert.NotNil(t, gateway)
	assert.NotNil(t, gateway.clients)
	assert.NotNil(t, gateway.broadcast)
	assert.NotNil(t, gateway.register)
	assert.NotNil(t, gateway.unregister)
}

func TestEventsGateway_BroadcastMessage(t *testing.T) {
	gateway := NewEventsGateway()
	go gateway.Run()

	// Test that BroadcastMessage doesn't panic with no clients
	gateway.BroadcastMessage(Message{
		Event: "test",
		Data:  "test data",
	})

	// Give goroutine time to process
	assert.NotNil(t, gateway.broadcast)
}

func TestEventsGateway_SendProgress(t *testing.T) {
	gateway := NewEventsGateway()
	go gateway.Run()

	// Test that SendProgress doesn't panic with no clients
	gateway.SendProgress(JobProgress{
		JobID:   "job-123",
		Status:  "processing",
		Message: "Test message",
	})

	assert.NotNil(t, gateway.broadcast)
}

func TestMessage_Fields(t *testing.T) {
	msg := Message{
		Event: "crawl:progress",
		Data: JobProgress{
			JobID:  "job-123",
			Status: "completed",
		},
	}

	assert.Equal(t, "crawl:progress", msg.Event)
	assert.NotNil(t, msg.Data)
}

func TestClient_Fields(t *testing.T) {
	gateway := NewEventsGateway()
	client := &Client{
		gateway: gateway,
		send:    make(chan []byte, 256),
	}

	assert.NotNil(t, client.gateway)
	assert.NotNil(t, client.send)
}

func TestStatusMessage(t *testing.T) {
	status := []string{"processing", "completed", "error", "finished"}

	for _, s := range status {
		progress := JobProgress{
			JobID:  "job-123",
			Status: s,
		}
		assert.Equal(t, s, progress.Status)
	}
}
