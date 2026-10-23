import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  X, 
  Award, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationToast() {
  const { activeToast, dismissToast, markAsRead } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 6500);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  if (!activeToast) return null;

  const handleClick = () => {
    if (activeToast.notification_id) {
      markAsRead(activeToast.notification_id);
    }
    dismissToast();
    if (activeToast.link) {
      navigate(activeToast.link);
    }
  };

  const getIcon = () => {
    switch (activeToast.type) {
      case 'GRADE':
        return <Award className="w-5 h-5 text-emerald-600" />;
      case 'ENROLLMENT':
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      case 'ASSIGNMENT':
      case 'SUBMISSION':
        return <FileText className="w-5 h-5 text-purple-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
  };

  const getBorderColor = () => {
    switch (activeToast.type) {
      case 'GRADE':
        return 'border-emerald-300 bg-emerald-50/95';
      case 'ENROLLMENT':
        return 'border-blue-300 bg-blue-50/95';
      case 'ASSIGNMENT':
      case 'SUBMISSION':
        return 'border-purple-300 bg-purple-50/95';
      default:
        return 'border-amber-300 bg-amber-50/95';
    }
  };

  return (
    <div className="fixed top-20 right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 duration-200">
      <div 
        className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md transition-all flex items-start gap-3.5 ${getBorderColor()}`}
      >
        <div className="p-2 bg-white rounded-xl shadow-xs shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0" onClick={handleClick} role="button">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Live Alert
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 truncate">
            {activeToast.title}
          </h4>
          <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
            {activeToast.message}
          </p>

          {activeToast.link && (
            <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 transition-colors">
              <span>View Details</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            dismissToast();
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
