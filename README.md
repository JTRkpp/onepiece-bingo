# One Piece Character Bingo

Next.js bingo board with a live crew list, room owner, shared missions, and voting.

## Play

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Add `?room=your-room` to share a room.

- The first named captain becomes the **room owner**.
- Only the owner can **Draw Mission**. Everyone else sees that owner's mission.
- Crew names are ordered with the owner first, then A–Z.

## Deploy

GitHub Actions builds a static export and deploys it to GitHub Pages on every push to `main`.

Enable Pages in the repo: **Settings → Pages → Source: GitHub Actions**.

Local production export:

```bash
npm run build
npm start
```
