'use client'
import { Disclosure } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { useLogoutMutation } from '@/redux/features/authApiSlice';
import { logout as setLogout } from '@/redux/features/authSlice';
import { NavLink } from '@/components/common';

export default function Navbar() {
    const pathname = usePathname();
    const dispatch = useAppDispatch();
    const [isProjectsMenuOpen, setProjectsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const menuContentRef = useRef(null);
    const [menuTimeout, setMenuTimeout] = useState<NodeJS.Timeout | null>(null);
    const [mouseLeftMenuContent, setMouseLeftMenuContent] = useState(false);

    const [logout] = useLogoutMutation();
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    useEffect(() => {
        const handleMouseLeave = () => {
            if (!mouseLeftMenuContent) {
                setMenuTimeout(
                    setTimeout(() => {
                        setProjectsMenuOpen(false);
                    }, 500)
                );
            }
        };

        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            document.removeEventListener('mouseleave', handleMouseLeave);
            if (menuTimeout) clearTimeout(menuTimeout);
        };
    }, [mouseLeftMenuContent]);

    const handleMenuContentMouseLeave = () => {
        setMouseLeftMenuContent(true);
    };

    const handleMenuContentMouseEnter = () => {
        setMouseLeftMenuContent(false);
    };

    const handleProjectsMouseEnter = () => {
        if (menuTimeout) clearTimeout(menuTimeout);
        setProjectsMenuOpen(true);
    };

    const handleProjectsMouseLeave = () => {
        setMenuTimeout(
            setTimeout(() => {
                setProjectsMenuOpen(false);
            }, 500)
        );
    };

    const handleLogout = () => {
        logout(undefined)
            .unwrap()
            .then(() => {
                dispatch(setLogout());
            });
    };

    const isSelected = (path: string) => pathname === path;

    const authLinks = (isMobile: boolean) => (
        <>
            <NavLink
                isSelected={isSelected('/dashboard')}
                isMobile={isMobile}
                href='/dashboard'
            >
                Dashboard
            </NavLink>


            <NavLink
                isSelected={isSelected('/all-projects')}
                isMobile={isMobile}
                href='/all-projects'
            >
                All Projects
            </NavLink>

            <NavLink
                isSelected={isSelected('/shared-projects-all')}
                isMobile={isMobile}
                href='/shared-projects-all'
            >
                Shared Projects
            </NavLink>


            {/* Projects sekmesi */}
            <div
                className="relative"
                onMouseEnter={handleProjectsMouseEnter}
                onMouseLeave={handleProjectsMouseLeave}
                ref={menuRef}
            >
                <button className="text-white hover:text-white px-3 py-2">
                    Projects
                </button>
                {isProjectsMenuOpen && (
                    <div
                        className="absolute ml-4 mt-2 w-48 bg-gray-800 shadow-lg rounded-lg"  
                        onMouseEnter={handleMenuContentMouseEnter}
                        onMouseLeave={handleMenuContentMouseLeave}
                        ref={menuContentRef}
                    >
                        <NavLink
                            href="/projects/create/"
                            className="block text-black px-4 py-2 hover:bg-gray-700"
                        >
                            Create New Project
                        </NavLink>
                    </div>
                )}
            </div>


            <NavLink isMobile={isMobile} onClick={handleLogout} >
                Logout
            </NavLink>
        </>
    );

    const guestLinks = (isMobile: boolean) => (
        <>
            <NavLink
                isSelected={isSelected('/auth/login')}
                isMobile={isMobile}
                href='/auth/login'
            >
                Login
            </NavLink>
            <NavLink
                isSelected={isSelected('/auth/register')}
                isMobile={isMobile}
                href='/auth/register'
            >
                Register
            </NavLink>
        </>
    );
    
    return (
        <>
            
            <style jsx>{`
                .snowflake-container {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    top: 0;
                    left: 0;
                    z-index: -10;
                    pointer-events: none;
                }
    
                .snowflake {
                    position: absolute;
                    opacity: 0; 
                    font-size: 1.5rem; 
                    animation: fall 10s linear infinite, fadeIn 2s forwards; 
                    pointer-events: none;
                }
    
                
                @keyframes fall {
                    0% {
                        transform: translateY(-100%) translateX(0);
                    }
                    100% {
                        transform: translateY(100%) translateX(0);
                    }
                }
    
                
                @keyframes fadeIn {
                    0% {
                        opacity: 0;
                    }
                    1% {
                        opacity: 1; 
                    }
                    100% {
                        opacity: 1;
                    }
                }
    
            `}</style>
    
            {/* Navbar */}
            <Disclosure as="nav" style={{ backgroundColor: '#1B1F3B' }} className="relative">
                {({ open }) => (
                    <>
                        {/* Snowflake Animation Container */}
                        <div className="absolute inset-0 pointer-events-none z-10">
                            <div className="snowflake-container">
                                {Array.from({ length: 100 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="snowflake text-white"
                                        style={{
                                            left: `${Math.random() * 100}%`, // rando-loc. in horizontal
                                            animationDuration: `${Math.random() * 6 + 6}s`, 
                                            animationDelay: `${Math.random() * 1}s`, // rando-delay
                                            opacity: 0, // at first I made it invisible.. 
                                            fontSize: `${Math.random() * 0.5 + 0.5}rem`, //par.size
                                        }}
                                    >
                                        ❄️
                                    </div>
                                ))}
                            </div>
                        </div>
    
                        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 relative z-20">
                            <div className="relative flex h-16 items-center justify-between">
                                {/* Mobile menu button */}
                                <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                                    <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                                        <span className="sr-only">Open main menu</span>
                                        {open ? (
                                            <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                                        ) : (
                                            <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                                        )}
                                    </Disclosure.Button>
                                </div>
    
                                {/* Logo and Title */}
                                <div className="flex flex-1 items-center justify-start sm:items-stretch sm:justify-start">
                                    <div className="flex flex-shrink-0 items-center">
                                        <NavLink href={isAuthenticated ? "/dashboard" : "/"} isBanner>
                                            <img
                                                src="https://nsa.deeper.la/deeper-gray-logo.png" // deeper-gray-logo
                                                alt="Deeper Logo"
                                                className="h-8 w-auto"
                                            />
                                        </NavLink>
                                    </div>
                                </div>
    
                                {/* Links */}
                                <div className="hidden sm:block sm:ml-auto">
                                    <div className="flex space-x-4">
                                        {isAuthenticated ? authLinks(false) : guestLinks(false)}
                                    </div>
                                </div>
                            </div>
                        </div>
    
                        {/* Mobile Links */}
                        <Disclosure.Panel className="sm:hidden relative z-20">
                            <div className="space-y-1 px-2 pb-3 pt-2">
                                {isAuthenticated ? authLinks(true) : guestLinks(true)}
                            </div>
                        </Disclosure.Panel>
                    </>
                )}
            </Disclosure>
        </>
    );
    
    
    
}
