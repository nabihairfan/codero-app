import './globals.css'

export const metadata = {
  title: 'Codero — Learn to Code',
  description: 'Learn Python the fun way, one lesson at a time.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}