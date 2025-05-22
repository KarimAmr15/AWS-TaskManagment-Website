import React, { useEffect, useState } from "react";
import { format } from "date-fns";

function parseJwt(token) {
  if (!token) return {};
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

const idToken = localStorage.getItem("idToken");
const userInfo = parseJwt(idToken);
const email = userInfo.email;
const username = userInfo["cognito:username"];





const TaskDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [titleInput, setTitleInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: "",
    description: "",
    due_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskData, setEditTaskData] = useState({
    title: "",
    description: "",
    due_date: format(new Date(), "yyyy-MM-dd"),
  });
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploadingTasks, setUploadingTasks] = useState({});

  const user_id = localStorage.getItem("user_id");
  const token = localStorage.getItem("idToken");


  const API =
    "https://w2vsfcgub7.execute-api.eu-north-1.amazonaws.com/production";

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line
  }, [user_id, token]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/tasks?user_id=${user_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
      setError("Failed to load tasks. Please try again.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    if (titleInput.trim() === "") {
      setError("Please enter a task title");
      return;
    }
    setNewTaskData({
      title: titleInput,
      description: "",
      due_date: format(new Date(), "yyyy-MM-dd"),
    });
    setShowCreateModal(true);
  };

  const handleCreateTask = async () => {
    try {
      const res = await fetch(`${API}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newTaskData,
          user_id,
        }),
      });

      if (!res.ok) throw new Error("Failed to add task");

      setTitleInput("");
      setShowCreateModal(false);
      setError(null);

      await fetchTasks();
    } catch (err) {
      console.error("Error adding task:", err);
      setError("Failed to add task. Please try again.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`${API}/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete task");
      setTasks((prev) => prev.filter((task) => task.task_id !== taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("Failed to delete task.");
    }
  };

  const handleEditTask = async () => {
    try {
      const res = await fetch(`${API}/tasks/${editingTask.task_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editTaskData,
          user_id,
        }),
      });

      if (!res.ok) throw new Error("Failed to update task");
      await fetchTasks();
      setEditingTask(null);
      setError(null);
    } catch (err) {
      console.error("Error updating task:", err);
      setError("Failed to update task. Please try again.");
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setEditTaskData({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date
        ? format(new Date(task.due_date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
    });
  };

  const handleFileChange = (taskId, file) => {
    setSelectedFiles((prev) => ({ ...prev, [taskId]: file }));
  };

  const handleUploadAttachment = async (taskId) => {
    const file = selectedFiles[taskId];
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setUploadingTasks((prev) => ({ ...prev, [taskId]: true }));
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("task_id", taskId);
      formData.append("user_id", user_id);

      const res = await fetch(`${API}/upload-attachment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload attachment");

      setSelectedFiles((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });

      await fetchTasks();
    } catch (err) {
      console.error("Error uploading attachment:", err);
      setError("Failed to upload attachment. Please try again.");
    } finally {
      setUploadingTasks((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleDeleteAttachment = async (attachmentId, taskId) => {
    try {
      const res = await fetch(`${API}/delete-attachment/${attachmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task_id: taskId }),
      });

      if (!res.ok) throw new Error("Failed to delete attachment");

      setTasks((prev) =>
        prev.map((task) =>
          task.task_id === taskId
            ? {
                ...task,
                attachments: task.attachments.filter(
                  (a) => a.attachment_id !== attachmentId
                ),
              }
            : task
        )
      );
    } catch (err) {
      console.error("Error deleting attachment:", err);
      setError("Failed to delete attachment.");
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Welcome to Your Task Dashboard</h2>
        <button
          onClick={() => setShowProfile(true)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
        >
          Profile
        </button>
      </div>

      {showProfile && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xs">
      <h3 className="text-lg font-semibold mb-4 text-black">User Profile</h3>
      <div className="mb-2 text-black">
  <strong>User ID:</strong> {user_id || "N/A"}
</div>
<div className="mb-2 text-black">
  <strong>Email:</strong> {email || "N/A"}
</div>
<div className="mb-4 text-black">
  <strong>Username:</strong> {username || "N/A"}
</div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowProfile(false)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
        >
          Close
        </button>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href =
              "https://eu-north-1wmvmurise.auth.eu-north-1.amazoncognito.com/login/continue?client_id=777ib2nn24hq37io8v6gatph2o&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth&response_type=token&scope=email+openid+phone";
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
        <button
          onClick={async () => {
            if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
            try {
              const res = await fetch(
                "https://w2vsfcgub7.execute-api.eu-north-1.amazonaws.com/production/delete-account",
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ user_id }),
                }
              );
              if (!res.ok) throw new Error("Failed to delete account");
              localStorage.clear();
              window.location.href =
                "https://eu-north-1wmvmurise.auth.eu-north-1.amazoncognito.com/login/continue?client_id=777ib2nn24hq37io8v6gatph2o&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth&response_type=token&scope=email+openid+phone";
            } catch (err) {
              alert("Failed to delete account. Please try again.");
            }
          }}
          className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900"
        >
          Delete Account
        </button>
      </div>
    </div>
  </div>
)}

      <p className="mb-6 text-gray-700">
        User ID: <code className="bg-gray-100 p-1 rounded">{user_id}</code>
      </p>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter task title..."
          onKeyPress={(e) => e.key === "Enter" && openCreateModal()}
        />
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Task"}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          {error}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTaskData.title}
                  onChange={(e) =>
                    setNewTaskData({ ...newTaskData, title: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTaskData.description}
                  onChange={(e) =>
                    setNewTaskData({
                      ...newTaskData,
                      description: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2 h-24"
                  placeholder="Enter task description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTaskData.due_date}
                  onChange={(e) =>
                    setNewTaskData({
                      ...newTaskData,
                      due_date: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2"
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">
          Your Tasks ({tasks.length})
        </h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <p className="text-gray-500">
              No tasks found. Create your first task above!
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <div
                key={task.task_id}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold text-gray-800">
                    {task.title}
                  </h4>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      new Date(task.due_date) < new Date()
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    Due: {formatDate(task.due_date)}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{task.description}</p>
                {task.attachments && task.attachments.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      Attachments:
                    </h5>
                    <div className="space-y-2">
                      {task.attachments.map((a) => (
                        <div
                          key={a.attachment_id}
                          className="flex justify-between items-center bg-gray-100 p-2 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span>📎</span>
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {a.file_name}
                            </a>
                            <span className="text-xs text-gray-500 ml-2">
                              (uploaded {formatDate(a.uploaded_at)})
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleDeleteAttachment(
                                a.attachment_id,
                                task.task_id
                              )
                            }
                            className="text-red-500 hover:underline text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => openEditModal(task)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
                  >
                    Edit
                  </button>
                  {editingTask && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-semibold mb-4">
                          Edit Task
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={editTaskData.title}
                              onChange={(e) =>
                                setEditTaskData({
                                  ...editTaskData,
                                  title: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg p-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={editTaskData.description}
                              onChange={(e) =>
                                setEditTaskData({
                                  ...editTaskData,
                                  description: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg p-2 h-24"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Due Date
                            </label>
                            <input
                              type="date"
                              value={editTaskData.due_date}
                              onChange={(e) =>
                                setEditTaskData({
                                  ...editTaskData,
                                  due_date: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg p-2"
                              min={format(new Date(), "yyyy-MM-dd")}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                          <button
                            onClick={() => setEditingTask(null)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleEditTask}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteTask(task.task_id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                  >
                    Delete
                  </button>
                </div>
                <div className="flex justify-end gap-2 items-center">
                  <input
                    type="file"
                    onChange={(e) =>
                      handleFileChange(task.task_id, e.target.files[0])
                    }
                    className="hidden"
                    id={`file-upload-${task.task_id}`}
                  />
                  <label
                    htmlFor={`file-upload-${task.task_id}`}
                    className="cursor-pointer bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-2 rounded"
                    title="Select file to upload"
                  >
                    📎
                  </label>
                  <button
                    onClick={() => handleUploadAttachment(task.task_id)}
                    disabled={uploadingTasks[task.task_id]}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded disabled:opacity-50"
                  >
                    {uploadingTasks[task.task_id]
                      ? "Uploading..."
                      : "Upload"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDashboard;