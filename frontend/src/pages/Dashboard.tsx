import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../lib/supabaseApi';
import StatusBadge from '../components/StatusBadge';
import {
  Wallet,
  Clock,
  TrendingUp,
  FileText,
  ArrowRight,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface DashboardStats {
  budget: {
    total: number;
    spent: number;
    remaining: number;
    academicYear: string;
  } | null;
  pendingApprovals: number;
  totalRequests: number;
  monthlySpending: number;
  requestsByStatus: Record<string, number>;
  recentRequests: any[];
}

const Dashboard = () => {
  const { profile, canApprove } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  const budgetPercentage = stats?.budget?.total 
    ? ((stats.budget.spent / stats.budget.total) * 100).toFixed(1)
    : 0;

  const isBudgetLow = Number(budgetPercentage) > 80;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {profile?.full_name}</p>
        </div>
        <Link
          to="/requests/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          New Request
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Budget Remaining */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isBudgetLow ? 'bg-orange-100' : 'bg-green-100'
            }`}>
              <Wallet className={`w-6 h-6 ${isBudgetLow ? 'text-orange-600' : 'text-green-600'}`} />
            </div>
            {isBudgetLow && (
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            )}
          </div>
          <p className="text-sm text-gray-500 mb-1">Budget Remaining</p>
          <p className="text-2xl font-bold text-gray-800">
            ₱{stats?.budget?.remaining?.toLocaleString() || 0}
          </p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Used: ₱{stats?.budget?.spent?.toLocaleString()}</span>
              <span>{budgetPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isBudgetLow ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(Number(budgetPercentage), 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        {canApprove() && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">Pending Approvals</p>
            <p className="text-2xl font-bold text-gray-800">{stats?.pendingApprovals || 0}</p>
            <Link 
              to="/approvals"
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Monthly Spending */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Spent This Month</p>
          <p className="text-2xl font-bold text-gray-800">
            ₱{stats?.monthlySpending?.toLocaleString() || 0}
          </p>
          <p className="mt-3 text-xs text-gray-400">
            Current month spending
          </p>
        </div>

        {/* Total Requests */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Total Requests</p>
          <p className="text-2xl font-bold text-gray-800">{stats?.totalRequests || 0}</p>
          <Link 
            to="/requests"
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Request Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Status Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(stats?.requestsByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <StatusBadge status={status} size="sm" />
                <span className="font-bold text-gray-700">{count}</span>
              </div>
            ))}
            {Object.keys(stats?.requestsByStatus || {}).length === 0 && (
              <p className="col-span-2 text-center text-gray-400 py-4">No requests yet</p>
            )}
          </div>
        </div>

        {/* Recent Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Requests</h3>
            <Link 
              to="/requests"
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentRequests?.length > 0 ? (
              stats.recentRequests.map((request: any) => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{request.item_name}</p>
                    <p className="text-sm text-gray-500">
                      {request.category?.name} • ₱{request.total_price?.toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={request.status} size="sm" showIcon={false} />
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-4">No recent requests</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
