import '../globals.css'
import Navbar from './navbar'


export default function AppLayout({children}: { children: React.ReactNode }) {
    return (
        <div className="bg-green-900 text-white min-h-screen">
            <Navbar/>
            <main>{children}</main>
        </div>
    )
}