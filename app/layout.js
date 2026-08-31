import "./globals.css";

export const metadata = {
  title: "One Piece Character Bingo",
  description: "One Piece Character Bingo and live crew voting"
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
