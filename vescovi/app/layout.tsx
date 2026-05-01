// app/layout.tsx
import './globals.css'

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="fr">
        <body className="bg-green-900 text-white">
        <main>{children}</main>
        </body>
        </html>
    )
}