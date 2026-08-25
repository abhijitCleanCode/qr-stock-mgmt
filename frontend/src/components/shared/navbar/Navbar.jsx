import { Link } from "react-router";
// import { springfieldLogo } from "@/assets"
// import UserProfile from "../UserProfile"

const Navbar = () => {
    return (
        <nav className="sticky top-0 z-20 px-3 pt-3 sm:px-5 sm:pt-4 lg:px-8">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-[24px] px-4 py-3 border border-white/60 bg-white/70 shadow-[0_20px_40px_rgba(25,28,30,0.06)] backdrop-blur-xl sm:px-6 lg:px-8">
                <div className="flex items-center gap-5 lg:gap-8 xl:gap-12">
                    <div className="flex items-center gap-2">
                        <Link to="/" className="flex items-center gap-2 group">
                            {/* <img src={springfieldLogo} alt="logo" width={28} height={28} /> */}
                            <span className="text-[15px] font-semibold text-[#1E1B4B] tracking-tight">Stock Mgmt</span>
                        </Link>
                    </div>
                </div>

                {/* <UserProfile /> */}
            </div>
        </nav>
    )
}

export default Navbar
