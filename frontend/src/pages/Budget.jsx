import { useState, useEffect } from 'react';
import { budgetAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  PieChart,
  Pencil,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';

const Budget = () => {
  const { isAdmin } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [currentBudget, setCurrentBudget] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    academicYear: '',
    totalAmount: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [budgetsRes, currentRes] = await Promise.all([
        budgetAPI.getAll(),
        budgetAPI.getCurrent()
      ]);
      setBudgets(budgetsRes.data);
      setCurrentBudget(currentRes.data);

      // Fetch report for current budget
      if (currentRes.data) {
        try {
          const reportRes = await budgetAPI.getReport(currentRes.data.academicYear);
          setReport(reportRes.data);
        } catch (err) {
          // Report might not be available
        }
      }
    } catch (err) {
      setError('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await budgetAPI.create(formData);
      setSuccess('Budget saved successfully');
      setShowModal(false);
      setFormData({ academicYear: '', totalAmount: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save budget');
    }
  };

  const handleEdit = (budget) => {
    setFormData({
      academicYear: budget.academicYear,
      totalAmount: budget.totalAmount.toString()
    });
    setShowModal(true);
  };

  const getUtilizationColor = (percentage) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const utilizationPercentage = currentBudget 
    ? ((currentBudget.spentAmount / currentBudget.totalAmount) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Budget Management</h1>
          <p className="text-gray-500 mt-1">Track and manage department budgets</p>
        </div>
        {isAdmin() && (
          <button
            onClick={() => { setFormData({ academicYear: '', totalAmount: '' }); setShowModal(true); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Set Budget
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto">×</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}

      {/* Current Budget Overview */}
      {currentBudget && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Current Academic Year</h2>
                <p className="text-gray-500">{currentBudget.academicYear}</p>
              </div>
            </div>
            {isAdmin() && (
              <button
                onClick={() => handleEdit(currentBudget)}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Pencil className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Total Budget</span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                ₱{currentBudget.totalAmount.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-orange-600 font-medium">Spent Amount</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">
                ₱{currentBudget.spentAmount.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Remaining</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                ₱{currentBudget.remainingAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Budget Utilization</span>
              <span className={`font-bold ${getUtilizationColor(utilizationPercentage)}`}>
                {utilizationPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  utilizationPercentage >= 90 ? 'bg-red-500' :
                  utilizationPercentage >= 75 ? 'bg-orange-500' :
                  utilizationPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Category Spending */}
      {report?.categorySpending?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Spending by Category</h2>
          </div>

          <div className="space-y-4">
            {report.categorySpending.map((item, index) => {
              const percentage = currentBudget 
                ? ((item.amount / currentBudget.spentAmount) * 100).toFixed(1)
                : 0;
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-medium">{item.category}</span>
                    <div className="text-right">
                      <span className="text-gray-800 font-bold">₱{item.amount.toLocaleString()}</span>
                      <span className="text-gray-500 text-sm ml-2">({percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Budget History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Academic Year</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Budget</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Spent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Remaining</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Utilization</th>
                {isAdmin() && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {budgets.map((budget) => {
                const util = ((budget.spentAmount / budget.totalAmount) * 100).toFixed(1);
                return (
                  <tr key={budget.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{budget.academicYear}</td>
                    <td className="px-4 py-3 text-gray-600">₱{budget.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">₱{budget.spentAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">₱{budget.remainingAmount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              util >= 90 ? 'bg-red-500' :
                              util >= 75 ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(util, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${getUtilizationColor(util)}`}>
                          {util}%
                        </span>
                      </div>
                    </td>
                    {isAdmin() && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEdit(budget)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                {formData.academicYear ? 'Edit Budget' : 'Set New Budget'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 2025-2026"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Budget Amount (₱)
                </label>
                <input
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
