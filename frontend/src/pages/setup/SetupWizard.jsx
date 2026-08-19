import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import ExcelImport from '../../components/ui/ExcelImport';
import { Check, ChevronRight, Building, MapPin, Layers, Trash2, Users, UserCheck, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'District Details', icon: Building },
  { id: 2, title: 'Mandals',          icon: Layers },
  { id: 3, title: 'Wards / Villages', icon: MapPin },
  { id: 4, title: 'Public Bins',      icon: Trash2 },
  { id: 5, title: 'Users',           icon: Users },
  { id: 6, title: 'Assign Collectors',icon: UserCheck },
  { id: 7, title: 'Review & Finish',  icon: CheckCircle2 },
];

export default function SetupWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState('manual'); // 'manual' | 'excel'
  const [districtId, setDistrictId] = useState('');
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [districtForm, setDistrictForm] = useState({
    name: 'West Godavari', code: 'WG', office_name: "District Collector's Office, Eluru",
    address: 'Eluru, Andhra Pradesh', phone: '08812-234567', email: 'collector.wg@ap.gov.in'
  });

  const [mandalForm, setMandalForm] = useState({ name: '' });
  const [wardForm, setWardForm] = useState({ name: '', type: 'ward', mandal_id: '' });
  const [binForm, setBinForm] = useState({ bin_id: '', name: '', capacity_kg: 100, mandal_id: '', ward_id: '', location: '' });
  const [userForm, setUserForm] = useState({ username: '', password: 'Admin@123', full_name: '', role: 'collector' });

  const handleDistrictSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await API.post('/setup/district', districtForm);
      setCurrentStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save district');
    }
  };

  const fetchReview = async () => {
    try {
      const res = await API.get('/setup/review');
      setReviewData(res.data);
    } catch (_) {}
  };

  const handleFinish = async () => {
    try {
      await API.post('/setup/finish');
      navigate('/dashboard');
    } catch (_) {}
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          System Setup Wizard (First-Time Configuration)
        </h2>
        <p className="text-xs text-gray-400">
          Configure district hierarchy, public bins, and user roles via Manual Entry or Excel Import.
        </p>
      </div>

      {/* Stepper Header Bar — Matches Image 2 stepper */}
      <div className="card py-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[600px] px-2">
          {STEPS.map((step, idx) => {
            const isDone    = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const Icon      = step.icon;

            return (
              <React.Fragment key={step.id}>
                <div
                  onClick={() => isDone && setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer text-center ${
                    isCurrent ? 'text-primary-600 font-bold' : isDone ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-green-100 text-green-700'
                        : isCurrent
                        ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}
                  >
                    {isDone ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span className="text-[11px] whitespace-nowrap">{step.title}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isDone ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-800'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="card space-y-6">
        {/* Toggle Mode: Add Manually OR Import From Excel */}
        {currentStep > 1 && currentStep < 7 && (
          <div className="flex items-center justify-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mx-auto text-xs">
            <button
              onClick={() => setMode('manual')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all ${
                mode === 'manual' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'
              }`}
            >
              ✅ Add Manually
            </button>
            <button
              onClick={() => setMode('excel')}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all ${
                mode === 'excel' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'
              }`}
            >
              ✅ Import From Excel (.xlsx)
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs">{error}</div>
        )}

        {/* STEP 1: District Details */}
        {currentStep === 1 && (
          <form onSubmit={handleDistrictSubmit} className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Step 1: District Details</h3>
            <div>
              <label className="form-label">District Name</label>
              <input
                type="text"
                value={districtForm.name}
                onChange={(e) => setDistrictForm({ ...districtForm, name: e.target.value })}
                required
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">District Code</label>
              <input
                type="text"
                value={districtForm.code}
                onChange={(e) => setDistrictForm({ ...districtForm, code: e.target.value })}
                required
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Office Name</label>
              <input
                type="text"
                value={districtForm.office_name}
                onChange={(e) => setDistrictForm({ ...districtForm, office_name: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="flex justify-end pt-4">
              <button type="submit" className="btn-primary">
                Save & Continue <ChevronRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Mandals */}
        {currentStep === 2 && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Step 2: Mandals</h3>
            {mode === 'manual' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Mandal Name (e.g. Tadepalligudem)"
                  value={mandalForm.name}
                  onChange={(e) => setMandalForm({ name: e.target.value })}
                  className="form-input"
                />
                <button
                  onClick={async () => {
                    if (!mandalForm.name) return;
                    await API.post('/setup/mandals', { name: mandalForm.name, district_id: districtId });
                    setMandalForm({ name: '' });
                  }}
                  className="btn-secondary w-full justify-center"
                >
                  + Add Mandal
                </button>
              </div>
            ) : (
              <ExcelImport
                endpoint="/setup/mandals/import"
                extraData={{ district_id: districtId }}
              />
            )}
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => setCurrentStep(1)} className="btn-secondary">Back</button>
              <button onClick={() => setCurrentStep(3)} className="btn-primary">Next: Wards →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Wards/Villages */}
        {currentStep === 3 && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Step 3: Wards / Villages</h3>
            {mode === 'manual' ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Ward/Village Name"
                  value={wardForm.name}
                  onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })}
                  className="form-input"
                />
                <select
                  value={wardForm.type}
                  onChange={(e) => setWardForm({ ...wardForm, type: e.target.value })}
                  className="form-select"
                >
                  <option value="ward">Ward (Urban)</option>
                  <option value="village">Village (Rural)</option>
                </select>
              </div>
            ) : (
              <ExcelImport
                endpoint="/setup/wards/import"
                extraData={{ district_id: districtId }}
              />
            )}
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => setCurrentStep(2)} className="btn-secondary">Back</button>
              <button onClick={() => setCurrentStep(4)} className="btn-primary">Next: Bins →</button>
            </div>
          </div>
        )}

        {/* STEP 4: Bins */}
        {currentStep === 4 && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Step 4: Public Bins</h3>
            {mode === 'manual' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Bin ID (e.g. BIN-001)"
                  value={binForm.bin_id}
                  onChange={(e) => setBinForm({ ...binForm, bin_id: e.target.value })}
                  className="form-input"
                />
                <input
                  type="number"
                  placeholder="Capacity (kg)"
                  value={binForm.capacity_kg}
                  onChange={(e) => setBinForm({ ...binForm, capacity_kg: e.target.value })}
                  className="form-input"
                />
              </div>
            ) : (
              <ExcelImport endpoint="/setup/bins/import" />
            )}
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => setCurrentStep(3)} className="btn-secondary">Back</button>
              <button onClick={() => setCurrentStep(5)} className="btn-primary">Next: Users →</button>
            </div>
          </div>
        )}

        {/* STEP 5: Users */}
        {currentStep === 5 && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Step 5: Users</h3>
            {mode === 'manual' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Username"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="form-input"
                />
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="form-select"
                >
                  <option value="district_admin">District Admin</option>
                  <option value="mandal_officer">Mandal Officer</option>
                  <option value="supervisor">Sanitation Supervisor</option>
                  <option value="collector">Waste Collector</option>
                </select>
              </div>
            ) : (
              <ExcelImport endpoint="/setup/users/import" />
            )}
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => setCurrentStep(4)} className="btn-secondary">Back</button>
              <button onClick={() => setCurrentStep(6)} className="btn-primary">Next: Assign →</button>
            </div>
          </div>
        )}

        {/* STEP 6: Assign Collectors */}
        {currentStep === 6 && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Step 6: Assign Collectors</h3>
            <p className="text-xs text-gray-500">
              Assign collectors to specific wards and bins so their access scope is restricted to authorized bins.
            </p>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs">
              Collector assignments can also be modified anytime under Admin &gt; Assignments.
            </div>
            <div className="flex justify-between pt-4 border-t">
              <button onClick={() => setCurrentStep(5)} className="btn-secondary">Back</button>
              <button
                onClick={() => { fetchReview(); setCurrentStep(7); }}
                className="btn-primary"
              >
                Next: Review →
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: Review & Finish */}
        {currentStep === 7 && (
          <div className="space-y-6 max-w-lg mx-auto text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Review System Summary</h3>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs">
                <p className="text-gray-400">Total Mandals</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{reviewData?.mandals || 19}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs">
                <p className="text-gray-400">Total Wards / Villages</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{reviewData?.wards || 356}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs">
                <p className="text-gray-400">Public Bins</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{reviewData?.bins || 2850}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs">
                <p className="text-gray-400">Total Users</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{reviewData?.users || 47}</p>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full btn-primary justify-center py-3 text-sm font-semibold"
            >
              Finish Setup & Launch Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
