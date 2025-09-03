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
GEMINI_API_KEY="Your-API-Key"
REDIS_HOST="Your-Redis-Host"
REDIS_PORT="Your-Redis-Port"
REDIS_USERNAME="Your-Redis-Username"
REDIS_PASSWORD="Your-Redis-Password"
DATABASE_URL="Your-Database-URL"
```

The agent connects to a Redis server to receive tasks and post results. The Redis connection details are loaded from the `.env` file.

The agent also connects to an MCP server called `expense-log-mcp`. The agent uses the `expense-log-mcp` npm package, and the database connection string is loaded from the `.env` file.

### ▶️ Usage

1. Build the agent:
   ```bash
   npm run build
   ```
2. Start the agent:
   ```bash
   npm run start
   ```

The agent will then start listening for tasks on the `discord:tasks` Redis stream.

## 🛠️ How it Works

1. The agent receives a task message from the `discord:tasks` Redis stream.
2. The agent uses the `getExpenseCategories` tool to find the correct expense category for the task.
3. The agent uses the `addExpense` tool to add the expense to the ledger.
4. The agent generates a response message and posts it to the `discord:results` Redis stream.

## ☁️ MCP Server

The agent uses the `expense-log-mcp` MCP server. You can find more information about this server at https://github.com/evanxd/expense-log-mcp/.

## 🙌 Contributing

Contributions are welcome! Please feel free to submit a pull request.

## 📄 License

This project is licensed under the MIT License.
