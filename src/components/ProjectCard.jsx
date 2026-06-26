import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function ProjectCard({ project }) {
  const statusIcon = () => {
    switch (project.status) {
      case 'Completed':
        return <CheckCircle className="text-success" size={18} />;
      case 'Pending':
        return <Clock className="text-warning" size={18} />;
      default:
        return <XCircle className="text-muted" size={18} />;
    }
  };

  return (
    <div className="project-card glass-panel p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-white truncate">{project.title}</h3>
        {statusIcon()}
      </div>
      <p className="text-sm text-gray-300">Client: {project.client_name}</p>
      <p className="text-sm text-gray-300">Progress: {project.completion_rate || 0}%</p>
      <Link to={`/project/${project.id}`} className="mt-3 inline-block text-primary hover:underline text-sm">
        View Details →
      </Link>
    </div>
  );
}
