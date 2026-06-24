# Engagement Brief Generator 🤖

A React-powered tool built for **Telos Labs** that uses Claude AI + web search to generate opinionated engagement briefs before a first client discovery call.

---

## What it does

Enter a company name and get a structured brief with:
- 📸 **Company Snapshot** — what they do, stage, and key facts
- 😩 **Pain Points** — specific operational pains with severity ratings
- ✨ **AI Opportunities** — where AI creates real leverage, with timing and impact
- ❓ **Discovery Questions** — ready-to-use questions for the call
- ⚠️ **Risks to Watch** — potential red flags

---

## Tech Stack

- React (JSX)
- Claude API (`claude-sonnet-4-6`) with web search tool
- No external UI libraries — pure inline styles

---

## Prerequisites

Before uploading to GitHub, make sure you have:

- [ ] A [GitHub account](https://github.com)
- [ ] [Git](https://git-scm.com/downloads) installed on your computer
- [ ] [Node.js](https://nodejs.org) installed (v18 or higher recommended)

---

## Step 1 — Set up your local project

Open your terminal and run the following commands one by one:

```bash
# 1. Create a new React project (using Vite)
npm create vite@latest engagement-brief-generator -- --template react

# 2. Go into the project folder
cd engagement-brief-generator

# 3. Install dependencies
npm install
```

---

## Step 2 — Add the component

1. Copy the file `engagement-brief-generator.jsx` into the `src/` folder of your project.
2. Open `src/App.jsx` and replace its contents with:

```jsx
import EngagementBriefGenerator from './engagement-brief-generator'

function App() {
  return <EngagementBriefGenerator />
}

export default App
```

---

## Step 3 — Test it locally

```bash
npm run dev
```

Open your browser at `http://localhost:5173` and verify everything works.

---

## Step 4 — Create a GitHub repository

1. Go to [https://github.com/new](https://github.com/new)
2. Fill in the details:
   - **Repository name:** `engagement-brief-generator`
   - **Description:** `AI-powered engagement brief tool for Telos Labs`
   - **Visibility:** Private or Public (your choice)
3. ✅ Do **NOT** check "Add a README file" (we already have one)
4. Click **"Create repository"**

---

## Step 5 — Initialize Git and push to GitHub

Back in your terminal, inside the project folder:

```bash
# 1. Initialize a git repository
git init

# 2. Add all files
git add .

# 3. Make your first commit
git commit -m "first commit: engagement brief generator"

# 4. Rename the branch to main
git branch -M main

# 5. Connect to your GitHub repo (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/engagement-brief-generator.git

# 6. Push the code
git push -u origin main
```

✅ Your code is now on GitHub!

---

## Step 6 — Add this README

This `README.md` file should already be in your project root. If not, place it there and run:

```bash
git add README.md
git commit -m "add README"
git push
```

---

## Project Structure

```
engagement-brief-generator/
├── src/
│   ├── App.jsx                          # Entry point
│   ├── engagement-brief-generator.jsx  # Main component
│   └── main.jsx                        # React root
├── index.html
├── package.json
├── vite.config.js
└── README.md                           # This file
```

---

## How the Claude API is wired

The app calls the Anthropic API directly from the browser. The API key is **not required in the code** — it is handled by the Claude.ai artifact environment.

> ⚠️ **Important:** If you plan to deploy this outside of Claude.ai (e.g. on Vercel or Netlify), you will need to move the API call to a backend/serverless function and inject your `ANTHROPIC_API_KEY` securely via environment variables. Never expose your API key in frontend code.

---

## Future improvements

- [ ] Export brief as PDF
- [ ] Save briefs to local history
- [ ] Add English language toggle
- [ ] Connect to CRM (HubSpot / Notion)

---

Built with ❤️ by Telos Labs
