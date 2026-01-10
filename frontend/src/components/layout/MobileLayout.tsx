import { ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnline } from '../../hooks/useOnline';
import { ToastContainer } from '../common/Toast';
import { useToast } from '../../hooks/useToast';

interface MobileLayoutProps {
  children: ReactNode;
  bottomNav?: ReactNode;
}

export function MobileLayout({ children, bottomNav }: MobileLayoutProps) {
  const isOnline = useOnline();
  const { t } = useTranslation();
  const toast = useToast();
  const offlineToastShown = useRef(false);

  // Show offline warning once
  useEffect(() => {
    if (!isOnline && !offlineToastShown.current) {
      toast.warning(t('common.offline'), 0); // Don't auto-dismiss
      offlineToastShown.current = true;
    } else if (isOnline) {
      offlineToastShown.current = false;
    }
  }, [isOnline, toast, t]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white text-center py-2 px-4 sticky top-0 z-50">
          <p className="text-sm font-medium">{t('common.offline')}</p>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-4">{children}</main>

      {/* Bottom Navigation */}
      {bottomNav && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 safe-area-bottom">
          {bottomNav}
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

