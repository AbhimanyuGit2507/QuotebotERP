import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-hidden`}>
        {children}
      </div>
    </div>
  );
};

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600">delete</span>
          </div>
          <h3 className="text-lg font-bold text-[var(--erp-text)]">{title}</h3>
        </div>
        <p className="text-sm text-[var(--erp-text-muted)] mb-2">{message}</p>
        {itemName && (
          <p className="text-sm font-medium text-[var(--erp-text)] bg-slate-50 px-3 py-2 rounded border border-[var(--erp-border)]">
            {itemName}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="btn btn-secondary btn-md"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger btn-md"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title = 'Error',
  message,
  details,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600">error</span>
          </div>
          <h3 className="text-lg font-bold text-[var(--erp-text)]">{title}</h3>
        </div>
        <p className="text-sm text-[var(--erp-text)] mb-3">{message}</p>
        {details && (
          <div className="bg-slate-900 text-slate-200 p-3 rounded text-[11px] font-mono overflow-x-auto max-h-40">
            <pre>{details}</pre>
          </div>
        )}
        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="btn btn-primary btn-md"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface SuccessToastProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ isVisible, message, onClose }) => {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <span className="material-symbols-outlined">check_circle</span>
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-0.5">
          <span className="material-symbols-outlined !text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
};

interface ManualOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title?: string;
  fieldLabel?: string;
  currentValue?: string;
  placeholder?: string;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Manual Override',
  fieldLabel = 'New Value',
  currentValue = '',
  placeholder = 'Enter new value...',
}) => {
  const [value, setValue] = React.useState(currentValue);

  React.useEffect(() => {
    setValue(currentValue);
  }, [currentValue, isOpen]);

  const handleConfirm = () => {
    onConfirm(value);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-600">edit</span>
          </div>
          <h3 className="text-lg font-bold text-[var(--erp-text)]">{title}</h3>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">{fieldLabel}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 focus:ring-2 focus:ring-[var(--erp-accent)] focus:border-[var(--erp-accent)]"
          />
        </div>
        <p className="text-[11px] text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-200 mb-4">
          <span className="font-bold">Note:</span> Manual overrides will be logged for audit purposes.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn btn-secondary btn-md"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-primary btn-md"
          >
            Apply Override
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface QuickCreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { client: string; items: string; notes: string }) => void;
}

export const QuickCreateQuoteModal: React.FC<QuickCreateQuoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = React.useState({ client: '', items: '', notes: '' });

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({ client: '', items: '', notes: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="border-b border-[var(--erp-border)] px-5 py-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--erp-text)]">Quick Create Quote</h3>
        <button onClick={onClose} className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Client *</label>
          <select
            value={formData.client}
            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
            className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
          >
            <option value="">Select client...</option>
            <option>Alpha Manufacturing Co.</option>
            <option>Global Logistics Ltd.</option>
            <option>Precision Instruments Inc.</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Items *</label>
          <textarea
            value={formData.items}
            onChange={(e) => setFormData({ ...formData, items: e.target.value })}
            placeholder="Enter items (one per line)..."
            className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 h-24 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 h-16 resize-none"
          />
        </div>
      </div>
      <div className="border-t border-[var(--erp-border)] px-5 py-3 flex justify-end gap-2 bg-slate-50">
        <button
          onClick={onClose}
          className="btn btn-ghost btn-md"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="btn btn-primary btn-md"
        >
          Create Quote
        </button>
      </div>
    </Modal>
  );
};

interface QuickAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { sku: string; name: string; price: string; stock: string }) => void;
}

export const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = React.useState({ sku: '', name: '', price: '', stock: '' });

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({ sku: '', name: '', price: '', stock: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="border-b border-[var(--erp-border)] px-5 py-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--erp-text)]">Quick Add Product</h3>
        <button onClick={onClose} className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">SKU *</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g., PRD-001"
              className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Price *</label>
            <input
              type="text"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="₹0.00"
              className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Product Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter product name..."
            className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">Initial Stock</label>
          <input
            type="text"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            placeholder="0"
            className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3"
          />
        </div>
      </div>
      <div className="border-t border-[var(--erp-border)] px-5 py-3 flex justify-end gap-2 bg-slate-50">
        <button
          onClick={onClose}
          className="btn btn-ghost btn-md"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="btn btn-primary btn-md"
        >
          Add Product
        </button>
      </div>
    </Modal>
  );
};

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title?: string;
  fieldLabel?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Input Required',
  fieldLabel = 'Value',
  placeholder = 'Enter a value...',
  defaultValue = '',
  confirmLabel = 'OK',
}) => {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600">edit</span>
          </div>
          <h3 className="text-lg font-bold text-[var(--erp-text)]">{title}</h3>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--erp-text-muted)] mb-1.5">{fieldLabel}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full text-sm border border-[var(--erp-border)] rounded py-2 px-3 focus:ring-2 focus:ring-[var(--erp-accent)] focus:border-[var(--erp-accent)] outline-none"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn btn-secondary btn-md"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-primary btn-md"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const Modals = {
  Modal,
  ConfirmDeleteModal,
  ErrorModal,
  SuccessToast,
  ManualOverrideModal,
  QuickCreateQuoteModal,
  QuickAddProductModal,
  PromptModal,
};

export default Modals;
