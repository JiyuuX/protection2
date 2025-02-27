'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface InstagramUser {
    username: string;
    userId: string;
    profilePic: string;
}

export default function CreateProject() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<InstagramUser[]>([]);
    const [searchResult, setSearchResult] = useState<InstagramUser | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            // Extract username from @mention
            const username = searchQuery.startsWith('@') ? searchQuery.slice(1) : searchQuery;
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/search-ig-user-info/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            
            if (data.success) {
                setSearchResult({
                    username: data.username,
                    userId: data.userId,
                    profilePic: data.profilePic
                });
            } else {
                alert('User not found');
            }
        } catch (error) {
            console.error('Error searching user:', error);
            alert('Error searching for user');
        } finally {
            setIsLoading(false);
        }
    };

    const addUser = () => {
        if (searchResult && !selectedUsers.find(user => user.userId === searchResult.userId)) {
            setSelectedUsers([...selectedUsers, searchResult]);
            setSearchResult(null);
            setSearchQuery('');
        }
    };

    const removeUser = (userId: string) => {
        setSelectedUsers(selectedUsers.filter(user => user.userId !== userId));
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            alert('Please enter a project title');
            return;
        }
        if (selectedUsers.length === 0) {
            alert('Please select at least one Instagram user');
            return;
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/create-file-project/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    users: selectedUsers.map(user => ({
                        username: user.username,
                        userId: user.userId
                    }))
                })
            });

            const data = await response.json();
            if (data.success) {
                router.push('/dashboard');
            } else {
                alert('Error creating project');
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Error creating project');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Create New Project</h1>
            
            {/* Project Title Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Project Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter project title"
                />
            </div>

            {/* Instagram User Search */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Search Instagram Users</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 p-2 border rounded-md"
                        placeholder="@username"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !searchQuery}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-400"
                    >
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>

            {/* Search Result */}
            {searchResult && (
                <div className="mb-6 p-4 border rounded-md">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                            <img
                                src={searchResult.profilePic}
                                alt={searchResult.username}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <p className="font-medium">@{searchResult.username}</p>
                            <p className="text-sm text-gray-500">ID: {searchResult.userId}</p>
                        </div>
                        <button
                            onClick={addUser}
                            className="ml-auto px-4 py-2 bg-green-500 text-white rounded-md"
                        >
                            Add User
                        </button>
                    </div>
                </div>
            )}

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-medium mb-4">Selected Users</h2>
                    <div className="space-y-2">
                        {selectedUsers.map(user => (
                            <div key={user.userId} className="flex items-center gap-4 p-2 border rounded-md">
                                <div className="w-8 h-8 rounded-full overflow-hidden">
                                    <img
                                        src={user.profilePic}
                                        alt={user.username}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="font-medium">@{user.username}</p>
                                    <p className="text-sm text-gray-500">ID: {user.userId}</p>
                                </div>
                                <button
                                    onClick={() => removeUser(user.userId)}
                                    className="ml-auto text-red-500"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={!title || selectedUsers.length === 0}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-400"
            >
                Create Project
            </button>
        </div>
    );
} 