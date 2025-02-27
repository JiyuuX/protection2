'use client';
import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { faArrowRight,faShare,faShareAlt, faCloudDownloadAlt, faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';


export default function SharedProjectsPage() {
  const [SharedProjectsWithMe, setSharedProjectsWithMe] = useState<{ project_title: string, shared_from: string, shared_to:string, role: string }[]>([]);
  const [SharedProjects, setSharedProjects] = useState<{ project_title: string, shared_from: string, shared_to:string,  role: string }[]>([]);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserEmail = async () => {
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
  
    fetchUserEmail();
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
        } else {
          throw new Error('Failed to fetch CSRF token');
        }
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };

    fetchCsrfToken();
    fetchSharedProjectsWithMe();
    fetchSharedProjects();
  }, []);

  const fetchSharedProjectsWithMe = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/shared-projects-withme/', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSharedProjectsWithMe(data);
        toast.success('Shared Projects With Me fetched successfully');
      } else {
        throw new Error('Failed to fetch Shared Projects With Me');
      }
    } catch (error) {
      console.error('Error fetching shared projects with me:', error);
    }
  };

  const fetchSharedProjects = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/shared-projects/', {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSharedProjects(data);
        toast.success('Shared Projects fetched successfully');
      } else {
        throw new Error('Failed to fetch Shared Projects');
      }
    } catch (error) {
      console.error('Error fetching shared projects:', error);
    }
  };

  const handleRoleChange = (projectTitle: string, newRole: string) => {
    setSharedProjects(prevProjects =>
      prevProjects.map(project =>
        project.project_title === projectTitle ? { ...project, role: newRole } : project
      )
    );
  };

  const handleSaveRoleChange = async (projectTitle: string, newRole: string, toEmail: string) => {
    setLoading(true);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/update-role/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ project_title: projectTitle, email: userEmail, to_email: toEmail, role: newRole }),
      });

      if (response.ok) {
        toast.success('Role updated successfully');
      } else {
        throw new Error('Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Error updating role');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToProject = (projectTitle: string) => {
    router.push(`/projects/map/${encodeURIComponent(projectTitle)}`);
  };

  const handleDownloadProject = async (project: string) => {
    setLoading(true);
    const requestData = {
      projectTitle: project,
      userEmail: userEmail,
    };
  
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_HOST + `/api/download-from-database/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(requestData),
      });
  
      if (response.ok) {
      const data = await response.json(); // JSON data from django

      // Veriyi Excel dosyasına dönüştür
      const worksheet = XLSX.utils.json_to_sheet(data.data); // Json to excel format
      const workbook = XLSX.utils.book_new(); // create new excel file
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ProjectData'); 

      // Download file
      XLSX.writeFile(workbook, `${project}.xlsx`); // download-file-xlsx format excel
      setLoading(false);
    } else {
      const errorData = await response.json();
      toast.error(`Failed to download project '${project}': ${errorData.error}`);
      setLoading(false);
    }
  } catch (error) {
    console.error(`Error downloading project '${project}':`, error);
    toast.error(`Error downloading project '${project}'`);
    }
  };

  return (
    <div className="p-4">
  <Toaster position="top-center" />

  {/* Notification Box */}
  <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-6 text-blue-800 rounded-lg">
    <h3 className="font-semibold text-lg">Actions Information</h3>
    <ul className="list-inside">
      <li className="flex items-center space-x-2">
        <FontAwesomeIcon icon={faArrowRight} className="text-blue-600" />
        <span>Go to Project: Navigate to the project page</span>
      </li>
      <li className="flex items-center space-x-2">
        <FontAwesomeIcon icon={faCloudDownloadAlt} className="text-indigo-600" />
        <span>Download: Download project data</span>
      </li>
      <li className="flex items-center space-x-2">
        <FontAwesomeIcon icon={faSyncAlt} className="text-green-600" />
        <span>Change Role: Update the user role</span>
      </li>
    </ul>
  </div>

  {/* Section for "Shared with Me" */}
  <div className="mb-8 flex items-center space-x-2">
    <FontAwesomeIcon icon={faShare} className="text-blue-600 text-2xl" />
    <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b-2 border-gray-300 pb-2">
    Received Projects 
    </h2>
  </div>

  {/* Table for Shared with Me Projects */}
  <table className="min-w-full bg-white border rounded-lg shadow-md mb-6">
    <thead>
      <tr className="bg-gray-100">
        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Project Title</th>
        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Shared From</th>
        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Role</th>
        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Actions</th>
      </tr>
    </thead>
    <tbody>
      {SharedProjectsWithMe.length > 0 ? (
        SharedProjectsWithMe.map((project, index) => (
          <tr key={index} className="hover:bg-gray-50">
            <td className="py-3 px-4 text-sm text-gray-600">{project.project_title}</td>
            <td className="py-3 px-4 text-sm text-gray-600">{project.shared_from}</td>
            <td className="py-3 px-4 text-sm text-gray-600">{project.role}</td>
            <td className="py-3 px-4 text-sm text-gray-600">
              <div className="flex space-x-4">
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="text-blue-600 hover:text-blue-800 cursor-pointer text-xl"
                  title="Go to Project"
                  onClick={() => handleGoToProject(project.project_title)}
                />
                <FontAwesomeIcon
                  icon={faCloudDownloadAlt}
                  className="text-indigo-600 hover:text-indigo-800 cursor-pointer text-xl"
                  title="Download"
                  onClick={() => handleDownloadProject(project.project_title)}
                />
              </div>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td className="py-3 px-4 text-center text-gray-500" colSpan={4}>
            No projects shared with you
          </td>
        </tr>
      )}
    </tbody>
  </table>

  {/* Section for "Shared" */}
    <div className="mb-8 flex items-center space-x-2">
    <FontAwesomeIcon icon={faShareAlt} className="text-green-600 text-2xl" />
    <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b-2 border-gray-300 pb-2">
      Shared Projects
    </h2>
  </div>
  {/* Table for Shared Projects */}
  <table className="min-w-full bg-white border rounded-lg shadow-md">
    <thead>
      <tr className="bg-gray-100">
        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Project Title</th>
        <th className="py-3 px-4 text-center text-sm font-medium text-gray-700">Shared To</th>
        <th className="py-3 px-4 text-center text-sm font-medium text-gray-700">Role</th>
        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Actions</th>
      </tr>
    </thead>
    <tbody>
  {SharedProjects.length > 0 ? (
    SharedProjects.map((project, index) => (
      project.shared_from !== userEmail && (
        <tr key={index} className="hover:bg-gray-50">
          <td className="py-3 px-4 text-sm text-gray-600">{project.project_title}</td>
          <td className="py-3 px-4 text-center text-sm text-gray-600">{project.shared_from}</td>
          <td className="py-3 px-4 text-center text-sm text-gray-600">
            <select
              value={project.role}
              onChange={(e) => handleRoleChange(project.project_title, e.target.value)}
              className="px-8 py-2 border rounded bg-white text-sm text-gray-600"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </td>
          <td className="py-3 px-4 text-sm text-gray-600">
            <div className="flex space-x-4">
              <FontAwesomeIcon
                icon={faSyncAlt}
                className="text-green-600 hover:text-green-800 cursor-pointer text-xl"
                title="Change Role"
                onClick={() =>
                  handleSaveRoleChange(project.project_title, project.role, project.shared_from)
                }
              />
              <FontAwesomeIcon
                icon={faArrowRight}
                className="text-blue-600 hover:text-blue-800 cursor-pointer text-xl"
                title="Go to Project"
                onClick={() => handleGoToProject(project.project_title)}
              />
              <FontAwesomeIcon
                icon={faCloudDownloadAlt}
                className="text-indigo-600 hover:text-indigo-800 cursor-pointer text-xl"
                title="Download"
                onClick={() => handleDownloadProject(project.project_title)}
              />
            </div>
          </td>
        </tr>
      )
    ))
  ) : (
    <tr>
      <td className="py-3 px-4 text-center text-gray-500" colSpan={4}>
        No projects shared by you
      </td>
    </tr>
  )}
</tbody>

  </table>

  {loading && (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="text-white text-lg">Processing...</div>
    </div>
  )}
</div>


  

  );
}
