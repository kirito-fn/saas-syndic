import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
        <p className="text-gray-500 mb-4">Page introuvable</p>
        <Link to="/dashboard" className="text-blue-600 hover:underline">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
