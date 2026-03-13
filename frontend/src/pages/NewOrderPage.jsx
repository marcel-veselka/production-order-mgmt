import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';

const STEPS = ['Product Details', 'Production Parameters', 'Review & Submit'];
const MAX_NOTES_LENGTH = 500;

export default function NewOrderPage() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [products, setProducts] = useState([]);
  const [productionLines, setProductionLines] = useState([]);

  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState({
    product: '',
    quantity: '',
    priority: 'medium',
    dueDate: '',
    productionLine: '',
    shift: 'morning',
    notes: '',
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setProducts(d.products || d.data || d || []))
      .catch(() => {});

    fetch('/api/production-lines', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setProductionLines(d.productionLines || d.data || d || []))
      .catch(() => {});
  }, []);

  const updateField = (field, value) => {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep = (s) => {
    const errs = {};
    if (s === 0) {
      if (!formData.product) errs.product = 'Product is required';
      if (!formData.quantity || Number(formData.quantity) <= 0) errs.quantity = 'Valid quantity is required';
      if (!formData.dueDate) errs.dueDate = 'Due date is required';
    }
    if (s === 1) {
      if (!formData.productionLine) errs.productionLine = 'Production line is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: formData.product,
          quantity: Number(formData.quantity),
          priority: formData.priority,
          dueDate: formData.dueDate,
          productionLineId: formData.productionLine,
          shift: formData.shift,
          notes: formData.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create order');
      }
      const data = await res.json();
      const orderNumber = data.order?.orderNumber || data.orderNumber || '';
      addNotification(`${orderNumber} created successfully`, 'success');
      navigate(`/orders/${data.order?.id || data.id || ''}`);
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-order-page">
      <div className="wizard-steps" role="navigation" aria-label="Order creation steps">
        {STEPS.map((label, i) => (
          <div
            key={i}
            className={`wizard-step ${i === step ? 'wizard-step-active' : ''} ${i < step ? 'wizard-step-completed' : ''}`}
          >
            <div className="wizard-step-circle" aria-current={i === step ? 'step' : undefined}>
              {i < step ? '\u2713' : i + 1}
            </div>
            <span className="wizard-step-label">{label}</span>
            {i < STEPS.length - 1 && <div className="wizard-step-line"></div>}
          </div>
        ))}
      </div>

      {isDirty && step < 2 && (
        <div className="unsaved-banner" role="status">
          {'\u26A0'} You have unsaved changes. Complete the wizard to submit your order.
        </div>
      )}

      <div className="card wizard-content">
        {step === 0 && (
          <div className="form-grid">
            <h3 className="card-title">Product Details</h3>
            <div className="form-group">
              <label htmlFor="new-product">Product</label>
              <select
                id="new-product"
                value={formData.product}
                onChange={(e) => updateField('product', e.target.value)}
                aria-required="true"
                aria-invalid={!!errors.product}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id || p.name} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.product && <span className="field-error" role="alert">{errors.product}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="new-quantity">Quantity</label>
              <input
                id="new-quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => updateField('quantity', e.target.value)}
                placeholder="Enter quantity"
                aria-required="true"
                aria-invalid={!!errors.quantity}
              />
              {errors.quantity && <span className="field-error" role="alert">{errors.quantity}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="new-priority">Priority</label>
              <select
                id="new-priority"
                value={formData.priority}
                onChange={(e) => updateField('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="new-dueDate">Due Date</label>
              <input
                id="new-dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => updateField('dueDate', e.target.value)}
                aria-required="true"
                aria-invalid={!!errors.dueDate}
              />
              {errors.dueDate && <span className="field-error" role="alert">{errors.dueDate}</span>}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="form-grid">
            <h3 className="card-title">Production Parameters</h3>
            <div className="form-group">
              <label htmlFor="new-productionLine">Production Line</label>
              <select
                id="new-productionLine"
                value={formData.productionLine}
                onChange={(e) => updateField('productionLine', e.target.value)}
                aria-required="true"
                aria-invalid={!!errors.productionLine}
              >
                <option value="">Select a production line</option>
                {productionLines.map((pl) => (
                  <option key={pl.id || pl.name} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
              {errors.productionLine && <span className="field-error" role="alert">{errors.productionLine}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="new-shift">Shift</label>
              <select
                id="new-shift"
                value={formData.shift}
                onChange={(e) => updateField('shift', e.target.value)}
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
              </select>
            </div>
            <div className="form-group form-group-full">
              <label htmlFor="new-notes">Notes</label>
              <textarea
                id="new-notes"
                value={formData.notes}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_NOTES_LENGTH) {
                    updateField('notes', e.target.value);
                  }
                }}
                rows={4}
                maxLength={MAX_NOTES_LENGTH}
                placeholder="Additional notes or instructions..."
                aria-describedby="notes-counter"
              />
              <span id="notes-counter" className={`char-counter ${formData.notes.length > MAX_NOTES_LENGTH * 0.9 ? 'char-counter-warn' : ''}`}>
                {formData.notes.length}/{MAX_NOTES_LENGTH}
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="review-step">
            <h3 className="card-title">Review & Submit</h3>
            <div className="review-section">
              <h4>Product Details</h4>
              <div className="detail-fields">
                <div className="detail-field">
                  <span className="detail-label">Product</span>
                  <span className="detail-value">
                    {products.find(p => p.id === formData.product)?.name || formData.product}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Quantity</span>
                  <span className="detail-value">{formData.quantity}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Priority</span>
                  <span className={`priority-badge priority-${formData.priority}`}>
                    {formData.priority ? formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1) : '-'}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Due Date</span>
                  <span className="detail-value">
                    {formData.dueDate ? new Date(formData.dueDate + 'T00:00:00').toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
            </div>
            <div className="review-section">
              <h4>Production Parameters</h4>
              <div className="detail-fields">
                <div className="detail-field">
                  <span className="detail-label">Production Line</span>
                  <span className="detail-value">
                    {productionLines.find(pl => pl.id === formData.productionLine)?.name || formData.productionLine}
                  </span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Shift</span>
                  <span className="detail-value">
                    {formData.shift ? formData.shift.charAt(0).toUpperCase() + formData.shift.slice(1) : '-'}
                  </span>
                </div>
                {formData.notes && (
                  <div className="detail-field detail-field-full">
                    <span className="detail-label">Notes</span>
                    <span className="detail-value">{formData.notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="wizard-nav">
          {step > 0 && (
            <button className="btn btn-outline" onClick={prevStep} aria-label="Go to previous step">
              Back
            </button>
          )}
          <div className="wizard-nav-right">
            {step < STEPS.length - 1 && (
              <button className="btn btn-primary" onClick={nextStep} aria-label="Go to next step">
                Next
              </button>
            )}
            {step === STEPS.length - 1 && (
              <button
                className="btn btn-success"
                onClick={handleSubmit}
                disabled={submitting}
                aria-label="Submit order"
              >
                {submitting ? 'Submitting...' : 'Submit Order'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
