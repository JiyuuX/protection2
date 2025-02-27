'use client';
import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function AllProjectsPage() {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [projects, setProjects] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [shareEmail, setShareEmail] = useState<string>('');
  const [shareRole, setShareRole] = useState<string>('Viewer');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/users/me/', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUserEmail(data.email);
        } else {
          throw new Error('Failed to fetch user email');
        }
      } catch (error) {
        console.error('Error fetching user email:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/get-csrf-token/', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
          toast.success('CSRF token fetched successfully');
        } else {
          throw new Error('Failed to fetch CSRF token');
        }
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };

    fetchCsrfToken();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/user-projects/', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects);
          toast.success('Projects fetched successfully');
        } else {
          throw new Error('Failed to fetch projects');
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

   
    fetchProjects();
  }, []);

  const handleGoToProject = (project: string) => {
    router.push(`/projects/map/${encodeURIComponent(project)}`);
  };

  const handleDeleteProject = async (project: string) => {
    setLoading(true); // Start loading when deletion begins
  
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_HOST + `/api/user-project/${encodeURIComponent(project)}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
  
      if (response.ok) {
        toast.success(`Project '${project}' deleted successfully`);
        // Remove the deleted project from the projects state
        setProjects((prevProjects) => prevProjects.filter((p) => p !== project));
      } else {
        const errorData = await response.json();
        toast.error(`Failed to delete project '${project}': ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error deleting project '${project}':`, error);
    } finally {
      setLoading(false); 
    }
  };
  
  

  const toggleShareCard = (project: string) => {
    if (activeProject === project) {
      setActiveProject(null); // Close the card if it's already open
    } else {
      setActiveProject(project); // Set the active project to show the card
      setSelectedProject(project);
    }
  };

  const handleShareProject = async () => {
    if (!selectedProject || !shareEmail) return;

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_HOST + `/api/share-project/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          projectTitle: selectedProject,
          from_email: userEmail,
          to_email: shareEmail,
          role: shareRole,
        }),
      });

      if (response.ok) {
        toast.success(`Project '${selectedProject}' shared successfully`);
        setActiveProject(null); // Hide the share card after successful share
      } else {
        const errorData = await response.json();
        toast.error(`Failed to share project '${selectedProject}': ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error sharing project '${selectedProject}':`, error);
      toast.error(`Error sharing project '${selectedProject}'`);
    }
  };

  const handleDownloadProject = async (project: string) => {
    const requestData = {
      projectTitle: project,
      userEmail: userEmail,
    };
  
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_HOST + `/api/download-file/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(requestData),
      });
  
      if (response.ok) {
        // Create a blob from the response
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project}.csv`; // Set the file name
        document.body.appendChild(a);
        a.click(); // Programmatically click the link to trigger the download
        document.body.removeChild(a); // Remove the link from the document
        URL.revokeObjectURL(url); // Free up memory
      } else {
        const errorData = await response.json();
        toast.error(`Failed to download project '${project}': ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error downloading project '${project}':`, error);
      toast.error(`Error downloading project '${project}'`);
    }
  };
  

  return (
    <div className="p-4 relative">
      <Toaster position="top-right" />
  
      <div className="absolute top-4 right-4">
        <button
          onClick={() => router.push('/projects/create/')}
          className="px-3 py-2 text-sm bg-green-500 hover:bg-green-400 text-white rounded"
        >
          Create New Project
        </button>
      </div>
  
      <h2 className="text-xl font-semibold mt-6 mb-4">My All Projects</h2>
      <ul className="space-y-2">
        {projects.map((project, index) => (
          <li key={index} className="flex flex-col border rounded p-2">
            <div className="flex justify-between items-center">
              <span>{project}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => toggleShareCard(project)}
                  className="px-2 py-1 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded"
                >
                  Share
                </button>
                <button
                  onClick={() => handleGoToProject(project)}
                  className="px-2 py-1 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded"
                >
                  Go to Project
                </button>
                <button
                  onClick={() => handleDeleteProject(project)}
                  className="px-2 py-1 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded"
                >
                  Delete
                </button>
                <button
                  onClick={() => handleDownloadProject(project)}
                  className="px-2 py-1 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded"
                >
                  Download
                </button>
              </div>
            </div>
            {activeProject === project && (
              <div className="mt-4 p-4 border rounded bg-gray-100">
                <h3 className="text-lg font-semibold mb-2">Share Project: {selectedProject}</h3>
                <div className="flex space-x-2 mb-4">
                  <input
                    type="email"
                    placeholder="Enter email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="p-2 border rounded w-full"
                  />
                  <select
                    value={shareRole}
                    onChange={(e) => setShareRole(e.target.value)}
                    className="px-8 py-2 border rounded bg-white text-sm text-gray-600"
                  >
                    <option value="Viewer">Viewer</option>
                    <option value="Editor">Editor</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleShareProject}
                    className="px-2 py-1 text-sm bg-green-500 hover:bg-green-400 text-white rounded"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => setActiveProject(null)}
                    className="px-2 py-1 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
  
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="animate-spin h-10 w-10 border-4 border-white rounded-full border-t-transparent"></div>
        </div>
      )}
    </div>
  );
  
}
