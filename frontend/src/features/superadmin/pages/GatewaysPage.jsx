import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputSwitch } from 'primereact/inputswitch';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { superAdminApi } from '../api/superAdminApi';

export const GatewaysPage = () => {
  const navigate = useNavigate();
  const toastRef = useRef(null);
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(false);

  // Default gateway cards
  const [gatewayCards, setGatewayCards] = useState([
    {
      type: 'PAYMENT',
      provider: 'RAZORPAY',
      name: 'Razorpay Payment Gateway',
      description: 'Accept UPI, Credit/Debit Cards, NetBanking, and Wallets in India.',
      icon: 'pi pi-credit-card',
      color: '#3399cc',
      keyId: '',
      keySecret: '',
      isActive: true,
      isTestMode: true,
    },
    {
      type: 'PAYMENT',
      provider: 'STRIPE',
      name: 'Stripe Global Gateway',
      description: 'International card payments, recurring direct debits, and SEPA.',
      icon: 'pi pi-globe',
      color: '#635bff',
      keyId: '',
      keySecret: '',
      isActive: false,
      isTestMode: true,
    },
    {
      type: 'SMS',
      provider: 'FAST2SMS',
      name: 'Fast2SMS Gateway',
      description: 'DLT-compliant Indian SMS route for admission alerts, OTPs, and fee reminders.',
      icon: 'pi pi-comment',
      color: '#f97316',
      keyId: '',
      keySecret: '',
      isActive: true,
      isTestMode: false,
    },
    {
      type: 'WHATSAPP',
      provider: 'INTERAKT',
      name: 'WhatsApp Business API (Interakt / Gupshup)',
      description: 'Automated WhatsApp circulars, student fee receipts, and parent broadcasts.',
      icon: 'pi pi-whatsapp',
      color: '#25d366',
      keyId: '',
      keySecret: '',
      isActive: true,
      isTestMode: false,
    },
  ]);

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getGateways();
      if (res.success && res.data.length > 0) {
        setGateways(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (gw) => {
    try {
      const payload = {
        schoolId: null, // Global Platform Default
        gatewayType: gw.type,
        provider: gw.provider,
        configJson: JSON.stringify({
          keyId: gw.keyId,
          keySecret: gw.keySecret,
          Test: gw.isTestMode,
        }),
        isActive: gw.isActive,
        isTestMode: gw.isTestMode,
      };

      const res = await superAdminApi.saveGateway(payload);
      if (res.success) {
        toastRef.current?.show({
          severity: 'success',
          summary: 'Configuration Saved',
          detail: `${gw.name} settings updated.`,
        });
      }
    } catch (err) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update gateway settings.',
      });
    }
  };

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toastRef} />

      <div className="bg-white p-4 border-round-lg shadow-1 border-1 surface-border flex flex-column md:flex-row align-items-start md:align-items-center justify-content-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 m-0">Global API & Gateway Integrations</h2>
          <p className="text-xs text-slate-500 m-0 mt-1">
            Configure default platform gateways for SMS, WhatsApp notifications, and payment collection. Tenants can inherit these defaults or override with their own credentials.
          </p>
        </div>
        <Button
          label="Manage WhatsApp Modules & Templates"
          icon="pi pi-whatsapp"
          size="small"
          className="bg-emerald-600 border-emerald-600 font-bold whitespace-nowrap"
          onClick={() => navigate('/superadmin/whatsapp')}
        />
      </div>

      <div className="grid">
        {gatewayCards.map((gw, idx) => (
          <div key={idx} className="col-12 md:col-6">
            <div className="p-4 bg-white border-round-xl shadow-1 border-1 surface-border flex flex-column justify-content-between h-full">
              <div>
                <div className="flex align-items-center justify-content-between mb-3">
                  <div className="flex align-items-center gap-2">
                    <div
                      className="flex align-items-center justify-content-center border-round text-white font-bold"
                      style={{ width: '36px', height: '36px', backgroundColor: gw.color }}
                    >
                      <i className={`${gw.icon} text-lg`}></i>
                    </div>
                    <div className="flex flex-column">
                      <span className="font-bold text-sm text-slate-800">{gw.name}</span>
                      <span className="text-xs text-slate-400 font-mono">{gw.type} • {gw.provider}</span>
                    </div>
                  </div>
                  <Tag value={gw.isActive ? 'Active' : 'Disabled'} severity={gw.isActive ? 'success' : 'secondary'} />
                </div>

                <p className="text-xs text-slate-500 mb-3">{gw.description}</p>

                <div className="flex flex-column gap-2 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">API Key / Merchant ID</label>
                    <InputText
                      value={gw.keyId}
                      onChange={(e) => {
                        const updated = [...gatewayCards];
                        updated[idx].keyId = e.target.value;
                        setGatewayCards(updated);
                      }}
                      placeholder="Enter Key ID / Client ID"
                      className="p-inputtext-sm w-full font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Secret Key / Auth Token</label>
                    <InputText
                      type="password"
                      value={gw.keySecret}
                      onChange={(e) => {
                        const updated = [...gatewayCards];
                        updated[idx].keySecret = e.target.value;
                        setGatewayCards(updated);
                      }}
                      placeholder="••••••••••••••••••••••••"
                      className="p-inputtext-sm w-full font-mono"
                    />
                  </div>

                  <div className="flex align-items-center justify-content-between pt-2">
                    <span className="font-semibold text-slate-700">Sandbox / Test Mode</span>
                    <InputSwitch
                      checked={gw.isTestMode}
                      onChange={(e) => {
                        const updated = [...gatewayCards];
                        updated[idx].isTestMode = e.value;
                        setGatewayCards(updated);
                      }}
                    />
                  </div>

                  <div className="flex align-items-center justify-content-between pt-2">
                    <span className="font-semibold text-slate-700">Enable Gateway</span>
                    <InputSwitch
                      checked={gw.isActive}
                      onChange={(e) => {
                        const updated = [...gatewayCards];
                        updated[idx].isActive = e.value;
                        setGatewayCards(updated);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-top-1 surface-border flex justify-content-end">
                <Button
                  label="Save Configuration"
                  icon="pi pi-check"
                  size="small"
                  className="bg-indigo-600 border-indigo-600"
                  onClick={() => handleSave(gw)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
