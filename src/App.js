import React, { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';

const BACKEND_BASE_URL = 'https://server-save-voucher.onrender.com';
const VOUCHER_CONFIGS_ENDPOINT = `${BACKEND_BASE_URL}/api/voucher-configs`;
const VOUCHER_ENDPOINT = `${BACKEND_BASE_URL}/api/save-voucher`;
const MAX_STATUS_ITEMS = 50;

const FS_BUTTONS_STYLE = {
  marginTop: 10,
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'center',
  maxWidth: 900,
};

const FEATURED_BUTTONS_STYLE = {
  marginTop: 14,
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'center',
  maxWidth: 900,
};

const EMPTY_STATUS_STYLE = {
  background: 'transparent',
  color: 'rgba(255,255,255,0.7)',
};

const STATUS_LABEL_STYLE = { fontWeight: 700 };
const STATUS_DATA_STYLE = { marginTop: 6 };

function toVoucherItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const promotionid = raw.promotionid ?? raw.promotionId ?? raw.id;
  const voucher_code = raw.voucher_code ?? raw.voucherCode ?? raw.code;
  const signature = raw.signature;

  if (!promotionid || !voucher_code || !signature) return null;

  return {
    promotionid: String(promotionid),
    voucher_code: String(voucher_code),
    signature: String(signature),
  };
}

function normalizeVoucherConfigs(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return [];

  const vouchers = [];

  for (const [key, value] of Object.entries(input)) {
    if (key === 'freeship_vouchers' && Array.isArray(value)) {
      for (const item of value) {
        const normalized = toVoucherItem({
          promotionid: item?.voucherIdString,
          voucher_code: item?.voucherCode,
          signature: item?.userSignature,
        });
        if (normalized) {
          vouchers.push({
            ...normalized,
            display_name: item?.benefitName || item?.voucherCode || normalized.voucher_code,
          });
        }
      }
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const normalized = toVoucherItem(value);
      if (normalized) {
        vouchers.push({
          ...normalized,
          display_name: value.display_name || value.target_name || key,
          source_key: key,
        });
      }
    }
  }

  return vouchers;
}

async function doFetch(url, body, signal) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

function getApiMessage(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;

  const errorCode = payload?.error ?? payload?.data?.error ?? payload?.data?.data?.error;
  const errorMessageCandidates = [
    payload?.error_msg,
    payload?.data?.error_msg,
    payload?.data?.data?.error_msg,
  ];

  if (errorMessageCandidates.some((value) => value === '')) {
    return 'Save voucher th�nh c�ng';
  }

  const errorMessage = errorMessageCandidates.find(
    (value) => typeof value === 'string' && value.trim() !== ''
  );

  if (errorCode === 19 || errorMessage === 'Failed to authenticate') {
    return 'Cookie khong hop le';
  }

  return (
    errorMessage ||
    payload?.message ||
    payload?.data?.message ||
    payload?.data?.data?.message ||
    (payload?.success === true ? 'Save voucher th�nh c�ng' : null) ||
    null
  );
}
function normalizeCookie(input) {
  const value = String(input ?? '').trim();
  if (!value) return '';
  if (value.startsWith('SPC_ST=')) return value;
  return `SPC_ST=${value}`;
}

async function saveSingleVoucherFS(cookie, voucher, signal) {
  const res = await doFetch(
    VOUCHER_ENDPOINT,
    {
      cookie,
      signature: voucher.signature,
      voucher_code: voucher.voucher_code.trim(),
      voucher_promotionid: voucher.promotionid,
    },
    signal
  );

  return { item: voucher.display_name || voucher.voucher_code, ...res };
}

function App() {
  const [cookie, setCookie] = useState('');
  const [loading, setLoading] = useState(false);
  const [voucherList, setVoucherList] = useState([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [configsError, setConfigsError] = useState('');
  const [statuses, setStatuses] = useState([]);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  const statusIdRef = useRef(0);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    },
    []
  );

  const appendStatuses = useCallback((items) => {
    if (!mountedRef.current || !items.length) return;

    setStatuses((prev) => {
      const next = items.map((item) => {
        statusIdRef.current += 1;
        return { id: `status-${statusIdRef.current}`, ...item };
      });
      return [...next, ...prev].slice(0, MAX_STATUS_ITEMS);
    });
  }, []);

  const clearStatuses = useCallback(() => setStatuses([]), []);
  const formatData = useCallback((data) => {
    const message = getApiMessage(data);
    if (message) return String(message);
    return typeof data === 'string' ? data : JSON.stringify(data);
  }, []);
  const isFeaturedVoucher = useCallback(
    (voucher) =>
      ['voucher_100k', 'voucher_30k', 'voucher_50_max_200k'].includes(voucher.source_key) ||
      voucher.voucher_code === 'CRMNUICLHCMT2' ||
      voucher.voucher_code === 'CRMNUICLSOUTHT2' ||
      voucher.voucher_code.trim() === 'CRMNUICLHCM35T2',
    []
  );
  const getFeaturedLabel = useCallback((voucher) => {
    if (voucher.source_key === 'voucher_100k' || voucher.voucher_code === 'CRMNUICLHCMT2') return 'Mã giảm 100k';
    if (voucher.source_key === 'voucher_30k' || voucher.voucher_code === 'CRMNUICLSOUTHT2') return 'Mã giảm 50 tối đa 100';
    return 'Mã giảm 35% tối đa 200';
  }, []);
  const featuredOrder = { voucher_100k: 0, voucher_30k: 1, voucher_50_max_200k: 2 };
  const featuredVouchers = voucherList
    .filter(isFeaturedVoucher)
    .sort((a, b) => (featuredOrder[a.source_key] ?? 99) - (featuredOrder[b.source_key] ?? 99));
  const normalVouchers = voucherList.filter((voucher) => !isFeaturedVoucher(voucher));

  useEffect(() => {
    let cancelled = false;
    setConfigsLoading(true);
    setConfigsError('');

    fetch(VOUCHER_CONFIGS_ENDPOINT, { method: 'GET' })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Load configs failed: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const normalizedList = normalizeVoucherConfigs(data);
        setVoucherList(normalizedList);
        if (!normalizedList.length) {
          setConfigsError('Khong tim thay voucher hop le tu API.');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setVoucherList([]);
          setConfigsError(err?.message ?? 'Khong tai duoc danh sach voucher.');
        }
      })
      .finally(() => {
        if (!cancelled) setConfigsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClickFSItem = useCallback(async (voucher, index) => {
    if (loading) return;

    const preparedCookie = normalizeCookie(cookie);
    if (!preparedCookie) return;

    clearStatuses();
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await saveSingleVoucherFS(preparedCookie, voucher, controller.signal);
      appendStatuses([
        {
          label: `${res.item ?? ''}`,
          ok: res.ok,
          status: res.status ?? null,
          data: res.data ?? res.error ?? null,
        },
      ]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (mountedRef.current) setLoading(false);
    }
  }, [appendStatuses, clearStatuses, cookie, loading]);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="heading">Voucher Shopee</h1>
        <p className="text-muted small">Nhập cookie dạng "SPC_ST=[value] hoặc [value]</p>

        <input
          className="input small"
          onChange={(e) => setCookie(e.target.value)}
          type="text"
          placeholder="Enter cookie here"
          value={cookie}
        />
        <div style={FEATURED_BUTTONS_STYLE}>
          {configsLoading ? (
            <div className="status-item" style={EMPTY_STATUS_STYLE}>
              Dang tai danh sach voucher...
            </div>
          ) : null}
          {!configsLoading && configsError ? (
            <div className="status-item error">{configsError}</div>
          ) : null}
          {featuredVouchers.map((voucher, index) => (
            <button
              key={`${voucher.promotionid}-featured`}
              className="btn btn-primary btn-lg"
              onClick={() => handleClickFSItem(voucher, index)}
              disabled={loading}
            >
              {getFeaturedLabel(voucher)}
            </button>
          ))}
        </div>
        <div style={FS_BUTTONS_STYLE}>
          {normalVouchers.map((voucher, index) => (
            <button
              key={`${voucher.promotionid}-${index}`}
              className="btn btn-outline btn-sm"
              onClick={() => handleClickFSItem(voucher, index)}
              disabled={loading}
            >
              {`Voucher Freeship ${index + 1}`}
            </button>
          ))}
        </div>

        <div className="status">
          {statuses.map((statusItem) => (
            <div key={statusItem.id} className={`status-item ${statusItem.ok ? 'success' : 'error'}`}>
              <div style={STATUS_LABEL_STYLE}>{statusItem.label}</div>
              <div style={STATUS_DATA_STYLE}>{formatData(statusItem.data)}</div>
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;
