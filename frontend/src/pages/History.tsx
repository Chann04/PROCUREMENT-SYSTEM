import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsAPI } from '../lib/supabaseApi';
import StatusBadge from '../components/StatusBadge';
import type { RequestWithRelations } from '../types/database';
import { Loader2, Eye, Calendar, Package } from 'lucide-react';

const History = () => {
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await requestsAPI.getMyRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load request history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Request History</h1>
        <p className="text-gray-500 mt-1">View all your past procurement requests</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No requests found</p>
          <Link 
            to="/requests/new" 
            className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
          >
            Create your first request
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div 
              key={request.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{request.item_name}</h3>
                    <StatusBadge status={request.status} size="sm" />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-medium text-gray-800">{request.category?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="font-medium text-gray-800">{request.quantity} units</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Price</p>
                      <p className="font-medium text-gray-800">₱{request.total_price?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium text-gray-800 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {request.description && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{request.description}</p>
                  )}

                  {request.status === 'Rejected' && request.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">
                        <span className="font-medium">Rejection Reason:</span> {request.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>

                <Link
                  to={`/requests/${request.id}`}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Eye className="w-5 h-5" />
                </Link>
              </div>

              {/* Timeline */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <span>Created: {new Date(request.created_at).toLocaleString()}</span>
                  {request.approved_at && (
                    <>
                      <span>•</span>
                      <span>Reviewed: {new Date(request.approved_at).toLocaleString()}</span>
                    </>
                  )}
                  {request.ordered_at && (
                    <>
                      <span>•</span>
                      <span>Ordered: {new Date(request.ordered_at).toLocaleString()}</span>
                    </>
                  )}
                  {request.completed_at && (
                    <>
                      <span>•</span>
                      <span>Completed: {new Date(request.completed_at).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
