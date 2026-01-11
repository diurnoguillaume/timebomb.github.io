# Time Bomb - Multiplayer Game

A thrilling online multiplayer deduction game based on the board game Time Bomb.

## Play Now
🎮 **[Play Time Bomb](https://diurnoguillaume.github.io/timebomb.github.io/)**

## How to Play
1. Create a room and share the 5-character code with friends
2. Wait for 4-8 players to join
3. Everyone clicks "Ready" when prepared
4. Host starts the game
5. Find all defusing wires (Sherlock team) or cut the bomb (Moriarty team)!

## Features
- Real-time multiplayer gameplay
- 4-8 player support
- Private room codes
- Game log to track actions
- Play again feature
- Mobile-friendly interface

## Tech Stack
- React 18
- Tailwind CSS
- Lucide Icons
- GitHub Pages

## Local Development
Simply open `index.html` in your browser to run locally.

## Credits
Based on the board game Time Bomb by Yusuke Sato.
```

---

## 🚀 **Steps to Deploy:**

1. **Clone your repository:**
```bash
git clone https://github.com/diurnoguillaume/timebomb.github.io.git
cd timebomb.github.io
```

2. **Add the files:**
```bash
# Create the files above (index.html, game.js, README.md)
git add .
git commit -m "Initial commit: Time Bomb multiplayer game"
git push origin main
```

3. **Enable GitHub Pages:**
   - Go to your repo: https://github.com/diurnoguillaume/timebomb.github.io
   - Click **Settings** → **Pages**
   - Under "Source", select **main** branch
   - Click **Save**

4. **Wait 1-2 minutes**, then visit:
   **https://diurnoguillaume.github.io/timebomb.github.io/**

---

## ⚠️ **Important Note:**

The game uses **in-memory storage** (mockStorage) which means:
- ✅ Works perfectly for testing
- ✅ Works when all players are on the same network
- ❌ **Rooms reset when page refreshes**
- ❌ **Won't persist across different devices/browsers**

For **production use** with real persistence, you'll need to replace `mockStorage` with a real backend like Firebase, Supabase, or a custom API. Would you like me to help you set that up?