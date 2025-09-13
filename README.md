# Expense Log Agent

This is a one-step agent that can receive task messages from a certain Redis stream and process them for users.

## 🚀 Getting Started

### Prerequisites

- Node.js (v24 or higher)
- Redis

### 📦 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/evanxd/expense-log-agent.git
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

### ⚙️ Configuration

Create a `.env` file in the root of the project. You can copy the `.env.example` file to get started:

```bash
cp .env.example .env
```

The agent requires the following variables in the `.env` file:

```
DATABASE_URL="Your-Database-URL"
EXPENSE_LOG_MCP_VERSION="1.0.9"
GEMINI_API_KEY="Your-API-Key"
MODEL_NAME="gemini-2.5-pro"
PORT="3000"
REDIS_HOST="Your-Redis-Host"
REDIS_PASSWORD="Your-Redis-Password"
REDIS_PORT="Your-Redis-Port"
REDIS_USERNAME="Your-Redis-Username"
STREAM_REQUESTS="discord:requests"
STREAM_RESULTS="discord:results"
```

The agent's configuration is managed through environment variables:

- **Server:** The `PORT` variable specifies the port on which the server will listen.
- **Model:** Uses `gemini-2.5-flash` by default, but can be specified with the `MODEL_NAME` variable.
- **Redis:** Connects to a Redis server for task queuing. Connection details (`REDIS_HOST`, `REDIS_PORT`, etc.) and stream names (`STREAM_REQUESTS`, `STREAM_RESULTS`) are loaded from the `.env` file.
- **MCP Server:** Connects to an `expense-log-mcp` server. The database connection string is loaded from the `DATABASE_URL` in the `.env` file.

### ▶️ Usage

1. Build the agent:
   ```bash
   npm run build
   ```
2. Start the agent:
   ```bash
   npm run start
   ```

The agent will then start listening for tasks on the configured Redis stream.

## 🛠️ How it Works

1. The agent receives a task message from the `STREAM_REQUESTS` Redis stream.
2. The agent uses the `getExpenseCategories` tool to find the correct expense category for the task.
3. The agent uses the `addExpense` tool to add the expense to the ledger.
4. The agent generates a response message and posts it to the `STREAM_RESULTS` Redis stream.

## ☁️ MCP Server

The agent uses the `expense-log-mcp` MCP server. You can find more information about this server at https://github.com/evanxd/expense-log-mcp/.

## 🙌 Contributing

Contributions are welcome! Please feel free to submit a pull request.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
