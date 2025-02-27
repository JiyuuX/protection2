'use client';
import { useState, useEffect,useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [projects, setProjects] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null); 

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
    fetchProjects();
  }, []);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
  
      // Check if the file is a CSV
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        toast.success('Valid CSV file selected');
      } else {
        setFile(null); // Reset the file if it's invalid
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset the file input visually
        }
        toast.error('Only .csv files are allowed. Please select a valid file.');
      }
    }
  };
  
  

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectTitle(e.target.value);
  };

  const resetForm = () => {
    setProjectTitle('');
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Ensure visual reset
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    // Check if the project title ends with _v[number]
    const invalidProjectTitlePattern = /_v\d+$/i;
    if (invalidProjectTitlePattern.test(projectTitle)) {
      toast.error('Project name cannot end with "*_v[number]"');
      return;
    }
  
    if (!file || !projectTitle) return;
  
    setLoading(true);
  
    try {
      // First, check if the project title already exists
      const checkResponse = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/check-all-user-projects/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ projectTitle, userEmail }),
        credentials: 'include',
      });
  
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.exists) {
          toast.error('Project name already taken, change the project name');
          resetForm(); // Reset the form in case of error
          setLoading(false);
          return;
        }
      } else {
        const errorData = await checkResponse.json();
        toast.error(`Error checking project: ${errorData.error}`);
        resetForm(); // Reset the form in case of error
        setLoading(false);
        return;
      }
  
      // If the project title is not taken, continue with the file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectTitle', projectTitle);
      formData.append('userEmail', userEmail);
  
      const uploadResponse = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/upload/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        body: formData,
        credentials: 'include',
      });
  
      if (uploadResponse.ok) {
        console.log('File uploaded successfully');
        toast.success('File uploaded successfully');
        resetForm(); // Reset form after successful upload
        await fetchProjects(); // Fetch the updated projects list
      } else {
        const errorData = await uploadResponse.json();
        toast.error(`File upload failed: ${errorData.error}`);
        resetForm(); // Reset form in case of error
      }
    } catch (error) {
      console.error('Error during submission:', error);
      toast.error('Error during submission');
      resetForm(); // Reset form in case of error
    } finally {
      resetForm();
      setLoading(false);
    }
  };
  
  

  const handleGoToProject = (project: string) => {
    window.open(`/projects/map/${encodeURIComponent(project)}`, '_blank');
  };

  const handleDeleteProject = async (project: string) => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_HOST + `/api/user-project/${encodeURIComponent(project)}/`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success(`Project '${project}' deleted successfully`);
        await fetchProjects(); // Fetch updated projects list
      } else {
        const errorData = await response.json();
        toast.error(`Failed to delete project '${project}': ${errorData.error}`);
      }
    } catch (error) {
      console.error(`Error deleting project '${project}':`, error);
      toast.error(`Error deleting project '${project}'`);
    }
  };

  return (
    <div className="p-4">
        {/* Rules */}
        <div className="p-4 mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded">
          <p className="font-semibold">Rules:</p>
          <ul className="list-disc ml-6">
            <li>Only .csv files are allowed.</li>
            <li>
              Uploaded .csv files must have
              <span className="font-semibold"> <span> </span> &lt;Id, Label, Modularity_Class, Pageranks, Filter, Level1, X, Y, Size, Color&gt;</span> 
              <span> </span>columns.
            </li>
            <li>Project names must be UNIQUE. You cannot create a project if someone already took the project name!</li>
            <li>
              Project names cannot end with "_v[number]".
              <br />
              For example:
              <ul className="list-inside list-disc ml-6">
                <li>"deeper_v1" is not allowed.</li>
              </ul>
            </li>
            
          </ul>
        </div>



      <h1 className="text-2xl font-bold mb-4">Upload File</h1>
      <Toaster position='top-right' />
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <input
          type="text"
          placeholder="Project Title"
          value={projectTitle}
          onChange={handleTitleChange}
          required
          className="p-2 border rounded"
        />
        <input
          ref={fileInputRef} // Attach the ref to the file input
          type="file"
          onChange={handleFileChange}
          className="p-2 border rounded"
        />
        <button
          type="submit"
          className={`p-2 text-white rounded ${loading || !file || !projectTitle ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}
          disabled={loading || !file || !projectTitle}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      <h2 className="text-2xl font-semibold text-gray-700 mt-12 mb-6">My Projects</h2>
      <ul className="space-y-4">
        {projects.slice().reverse().map((project, index) => (
          <li key={index} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition duration-200 ease-in-out">
            <span className="text-lg font-medium">{project}</span>
            <div className="flex space-x-3">
              <button
                onClick={() => handleGoToProject(project)}
                className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition duration-300"
              >
                Go to Project
              </button>
              <button
                onClick={() => handleDeleteProject(project)}
                className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition duration-300"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="w-32 h-32 border-4 border-t-4 border-t-blue-500 border-gray-300 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
