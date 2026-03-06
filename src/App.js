import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiRefreshCw,
  FiTruck,
} from 'react-icons/fi';
import './App.css';

const ORDERS_API_URL = 'https://minhquy.click/api/orders';
const DEFAULT_DELAY_SECONDS = 0;
const IMAGE_PREVIEW_SIZE = 260;
const IMAGE_PREVIEW_GAP = 14;
const SHIPPER_PHONE_CURRENT_KEY = '__shipper_phone_current';
const SHIPPER_PHONE_PREVIOUS_KEY = '__shipper_phone_previous';
const SHIPPER_STATUS_KEY = '__shipper_status';
const SPC_ST_KEY = '__spc_st';
const INDEX_COLUMN_KEY = '__index';
const TEXT_PREVIEW_LENGTH = 22;

const TABLE_COLUMNS = [
  INDEX_COLUMN_KEY,
  'productImg',
  'cod',
  'address',
  'status',
  SHIPPER_STATUS_KEY,
  SHIPPER_PHONE_CURRENT_KEY,
  SHIPPER_PHONE_PREVIOUS_KEY,
  SPC_ST_KEY,
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sleepWithCancel(ms, shouldCancel) {
  const stepMs = 100;
  let elapsed = 0;

  while (elapsed < ms) {
    if (shouldCancel()) return false;
    const next = Math.min(stepMs, ms - elapsed);
    await sleep(next);
    elapsed += next;
  }

  return !shouldCancel();
}

function canonicalHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function pickLatestOrder(orders) {
  if (!Array.isArray(orders)) return null;
  const firstOrder = orders.find((item) => item && typeof item === 'object');
  return firstOrder || null;
}

function normalizeSpcSt(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.startsWith('SPC_ST=') ? raw : `SPC_ST=${raw}`;
}

function maskSpcSt(value) {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (text.length <= TEXT_PREVIEW_LENGTH) return text;
  return `${text.slice(0, TEXT_PREVIEW_LENGTH)}....`;
}

function isEmptyShipperPhone(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  const lowered = text.toLowerCase();
  return text === '-' || text === '—' || lowered === 'null' || lowered === 'undefined';
}

function extractShipperPhones(orders) {
  const set = new Set();

  for (const order of orders) {
    const value = order?.shipperPhone;
    if (isEmptyShipperPhone(value)) continue;
    set.add(String(value).trim());
  }

  return [...set];
}

function areStringSetsEqual(first, second) {
  if (first.length !== second.length) return false;
  const firstSet = new Set(first);
  return second.every((item) => firstSet.has(item));
}

function deriveShipperStatus(previousPhones, nextPhones) {
  const hadShipper = previousPhones.length > 0;
  const hasShipper = nextPhones.length > 0;

  if (!hadShipper && !hasShipper) {
    return 'chua co ship nhan hang';
  }

  if (!hadShipper && hasShipper) {
    return 'da co ship nhan hang';
  }

  if (hadShipper && !hasShipper) {
    return 'ship da huy don cho ship moi nhan don';
  }

  if (!areStringSetsEqual(previousPhones, nextPhones)) {
    return 'da doi ship moi';
  }

  return 'ship giu nguyen';
}

function getOrderValues(orders, key) {
  const values = orders
    .map((order) => order?.[key])
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
    .map((value) => String(value).trim());

  if (!values.length) return [];
  return [...new Set(values)];
}

function formatUpdatedTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

async function fetchOrdersByCookie(cookie, signal) {
  const response = await fetch(ORDERS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ cookies: cookie }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const payload = await response.json();
  const rawCount = Number(payload?.count);
  const hasPositiveCount = Number.isFinite(rawCount) ? rawCount > 0 : null;
  const orders =
    Array.isArray(payload?.orders) ? payload.orders.filter((item) => item && typeof item === 'object') : [];
  const latestOrder = pickLatestOrder(orders);

  return {
    orders: latestOrder ? [latestOrder] : [],
    hasData: hasPositiveCount === null ? Boolean(latestOrder) : hasPositiveCount && Boolean(latestOrder),
  };
}

function isProbablyImageUrl(value) {
  const text = String(value || '').trim();
  return /^https?:\/\//i.test(text);
}

function getColumnLabel(key) {
  switch (key) {
    case INDEX_COLUMN_KEY:
      return 'stt';
    case SHIPPER_PHONE_CURRENT_KEY:
      return 'shipperPhone';
    case SHIPPER_PHONE_PREVIOUS_KEY:
      return 'shipperPhone truoc do';
    case SHIPPER_STATUS_KEY:
      return 'trang thai shiper';
    case SPC_ST_KEY:
      return 'SPC_ST';
    default:
      return key;
  }
}

function getShipperStatusMeta(statusText, loading, hasError) {
  if (loading) {
    return { icon: FiLoader, tone: 'loading', label: 'dang cap nhat...' };
  }

  if (hasError) {
    return { icon: FiAlertCircle, tone: 'error', label: statusText || 'co loi cap nhat' };
  }

  const status = String(statusText || '').trim();

  switch (status) {
    case 'da co ship nhan hang':
      return { icon: FiCheckCircle, tone: 'success', label: status };
    case 'ship da huy don cho ship moi nhan don':
      return { icon: FiAlertTriangle, tone: 'warning', label: status };
    case 'da doi ship moi':
      return { icon: FiRefreshCw, tone: 'info', label: status };
    case 'ship giu nguyen':
      return { icon: FiTruck, tone: 'stable', label: status };
    case 'chua co ship nhan hang':
      return { icon: FiClock, tone: 'muted', label: status };
    default:
      return { icon: FiClock, tone: 'muted', label: status || 'chua cap nhat' };
  }
}

function getImagePreviewPosition(x, y) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let left = x + IMAGE_PREVIEW_GAP;
  let top = y + IMAGE_PREVIEW_GAP;

  if (left + IMAGE_PREVIEW_SIZE > viewportWidth - 8) {
    left = x - IMAGE_PREVIEW_SIZE - IMAGE_PREVIEW_GAP;
  }

  if (top + IMAGE_PREVIEW_SIZE > viewportHeight - 8) {
    top = y - IMAGE_PREVIEW_SIZE - IMAGE_PREVIEW_GAP;
  }

  return {
    left: Math.max(8, left),
    top: Math.max(8, top),
  };
}

function App() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loadingAll, setLoadingAll] = useState(false);
  const [processNote, setProcessNote] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(String(DEFAULT_DELAY_SECONDS));
  const [imagePreview, setImagePreview] = useState(null);
  const [expandedSpcStRows, setExpandedSpcStRows] = useState({});

  const hasRows = rows.length > 0;
  const visibleRows = rows.filter((row) => row.loading || !row.hasFetched || row.orders.length > 0);
  const rowsRef = useRef(rows);
  const cancelAllRef = useRef(false);
  const activeAbortRef = useRef(null);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(
    () => () => {
      cancelAllRef.current = true;
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
    },
    []
  );

  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setFileName(file.name);
    setProcessNote('');
    cancelAllRef.current = true;
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    setLoadingAll(false);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error('File khong co sheet hop le.');
      }

      const firstSheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      if (!rawRows.length) {
        throw new Error('Sheet khong co du lieu.');
      }

      const headerRowIndex = rawRows.findIndex((row) =>
        Array.isArray(row) && row.some((cell) => String(cell || '').trim() !== '')
      );

      if (headerRowIndex < 0) {
        throw new Error('Khong tim thay dong tieu de.');
      }

      const headerRow = rawRows[headerRowIndex];
      const headerMap = headerRow.map((cell) => canonicalHeader(cell));
      const spcStIndex = headerMap.findIndex((key) => key === 'spcst');

      if (spcStIndex < 0) {
        throw new Error('Can co cot tieu de: "SPC_ST".');
      }

      const nextRows = rawRows
        .slice(headerRowIndex + 1)
        .map((row, index) => {
          const cookie = normalizeSpcSt(row?.[spcStIndex]);
          if (!cookie) return null;

          return {
            id: `row-${index + 1}`,
            cookie,
            orders: [],
            shipperPhones: [],
            previousShipperPhones: [],
            hasFetched: false,
            loading: false,
            error: '',
            updatedAt: '',
            shipperStatus: 'chua cap nhat',
          };
        })
        .filter(Boolean);

      if (!nextRows.length) {
        throw new Error('Khong co dong SPC_ST hop le.');
      }

      setRows(nextRows);
      setExpandedSpcStRows({});
    } catch (err) {
      setRows([]);
      setExpandedSpcStRows({});
      setError(err?.message || 'Khong doc duoc file Excel.');
    } finally {
      event.target.value = '';
    }
  }, []);

  const updateRowOrders = useCallback(async (rowId, cookie, options = {}) => {
    const { signal } = options;

    if (!cookie) {
      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                error: 'Thieu SPC_ST',
                loading: false,
                shipperStatus: 'khong the cap nhat do thieu SPC_ST',
              }
            : row
        )
      );
      return { ok: false, aborted: false };
    }

    const previousRow = rowsRef.current.find((row) => row.id === rowId);
    const previousPhones = Array.isArray(previousRow?.shipperPhones)
      ? previousRow.shipperPhones
      : extractShipperPhones(previousRow?.orders || []);

    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, loading: true, error: '' } : row))
    );

    try {
      const { orders, hasData } = await fetchOrdersByCookie(cookie, signal);
      const finalOrders = hasData ? orders : [];
      const nextPhones = extractShipperPhones(finalOrders);
      const nextShipperStatus = deriveShipperStatus(previousPhones, nextPhones);

      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                orders: finalOrders,
                shipperPhones: nextPhones,
                previousShipperPhones: previousPhones,
                hasFetched: true,
                loading: false,
                error: '',
                updatedAt: new Date().toISOString(),
                shipperStatus: nextShipperStatus,
              }
            : row
        )
      );

      return { ok: true, aborted: false };
    } catch (err) {
      const isAbortError = err?.name === 'AbortError';

      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                loading: false,
                error: isAbortError ? 'Da huy cap nhat' : err?.message || 'Khong goi duoc API orders.',
              }
            : row
        )
      );

      return { ok: false, aborted: isAbortError };
    }
  }, []);

  const handleUpdateAll = useCallback(async () => {
    if (loadingAll || !rows.length) return;

    const delayValue = Number(delaySeconds);
    const delayMs =
      Number.isFinite(delayValue) && delayValue >= 0 ? delayValue * 1000 : DEFAULT_DELAY_SECONDS * 1000;

    cancelAllRef.current = false;
    setLoadingAll(true);
    setProcessNote('Dang cap nhat tat ca...');

    try {
      const targets = rows.map((row) => ({ id: row.id, cookie: row.cookie }));

      for (let index = 0; index < targets.length; index += 1) {
        if (cancelAllRef.current) break;

        const target = targets[index];
        const controller = new AbortController();
        activeAbortRef.current = controller;

        const result = await updateRowOrders(target.id, target.cookie, { signal: controller.signal });
        activeAbortRef.current = null;

        if (cancelAllRef.current || result.aborted) break;

        if (index < targets.length - 1) {
          const continueRun = await sleepWithCancel(delayMs, () => cancelAllRef.current);
          if (!continueRun) break;
        }
      }

      if (cancelAllRef.current) {
        setProcessNote('Da huy cap nhat tat ca.');
      } else {
        setProcessNote('Da cap nhat xong tat ca dong.');
      }
    } finally {
      activeAbortRef.current = null;
      setLoadingAll(false);
      cancelAllRef.current = false;
    }
  }, [delaySeconds, loadingAll, rows, updateRowOrders]);

  const handleCancelUpdateAll = useCallback(() => {
    if (!loadingAll) return;

    cancelAllRef.current = true;
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
    setProcessNote('Dang huy cap nhat...');
  }, [loadingAll]);

  const showImagePreview = useCallback((src, event) => {
    if (!src) return;
    setImagePreview({ src, x: event.clientX, y: event.clientY });
  }, []);

  const moveImagePreview = useCallback((event) => {
    setImagePreview((prev) => {
      if (!prev) return prev;
      return { ...prev, x: event.clientX, y: event.clientY };
    });
  }, []);

  const hideImagePreview = useCallback(() => {
    setImagePreview(null);
  }, []);

  const toggleSpcSt = useCallback((rowId) => {
    setExpandedSpcStRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);

  const renderOrderCell = useCallback(
    (row, columnKey, rowIndex) => {
      if (columnKey === INDEX_COLUMN_KEY) {
        return rowIndex + 1;
      }

      if (columnKey === SPC_ST_KEY) {
        const isExpanded = Boolean(expandedSpcStRows[row.id]);
        const displayValue = isExpanded ? row.cookie : maskSpcSt(row.cookie);
        const canToggle = row.cookie.length > 22;

        return (
          <div className="spc-cell">
            <span title={row.cookie}>{displayValue}</span>
            {canToggle ? (
              <button className="spc-toggle-btn" type="button" onClick={() => toggleSpcSt(row.id)}>
                {isExpanded ? 'Thu gon' : 'Xem tat ca'}
              </button>
            ) : null}
          </div>
        );
      }

      if (columnKey === SHIPPER_PHONE_CURRENT_KEY) {
        return row.shipperPhones.length ? row.shipperPhones.join(' | ') : '-';
      }

      if (columnKey === SHIPPER_PHONE_PREVIOUS_KEY) {
        return row.previousShipperPhones.length ? row.previousShipperPhones.join(' | ') : '-';
      }

      if (columnKey === SHIPPER_STATUS_KEY) {
        const statusMeta = getShipperStatusMeta(row.shipperStatus, row.loading, Boolean(row.error));
        const StatusIcon = statusMeta.icon;
        return (
          <div className="row-actions">
            <div className={`shipper-status-chip ${statusMeta.tone}`}>
              <StatusIcon className={statusMeta.tone === 'loading' ? 'spin' : ''} />
              <span>{statusMeta.label}</span>
            </div>
            <button
              className="action-btn secondary"
              type="button"
              disabled={loadingAll || row.loading}
              onClick={() => updateRowOrders(row.id, row.cookie)}
            >
              {row.loading ? 'Dang tai...' : 'Cap nhat'}
            </button>
            {row.error ? <div className="cell-error">{row.error}</div> : null}
            {!row.error && row.updatedAt ? (
              <div className="cell-meta">Da cap nhat: {formatUpdatedTime(row.updatedAt)}</div>
            ) : null}
          </div>
        );
      }

      const values = getOrderValues(row.orders, columnKey);
      if (!values.length) return '-';

      if (columnKey === 'productImg') {
        return (
          <div className="product-images">
            {values.map((value, index) =>
              isProbablyImageUrl(value) ? (
                <a
                  key={`${row.id}-${columnKey}-${index}`}
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="product-image-link"
                >
                  <img
                    src={value}
                    alt={`product-${index + 1}`}
                    className="product-image"
                    loading="lazy"
                    onMouseEnter={(event) => showImagePreview(value, event)}
                    onMouseMove={moveImagePreview}
                    onMouseLeave={hideImagePreview}
                  />
                </a>
              ) : (
                <span key={`${row.id}-${columnKey}-${index}`}>{value}</span>
              )
            )}
          </div>
        );
      }

      return values.join(' | ');
    },
    [expandedSpcStRows, hideImagePreview, loadingAll, moveImagePreview, showImagePreview, toggleSpcSt, updateRowOrders]
  );

  return (
    <main className="page">
      <section className="card">
        <h3>Excel Orders Viewer</h3>
        <label className="upload" htmlFor="excel-input">
          <span>Chon file Excel</span>
          <input id="excel-input" type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        </label>

        {fileName ? <p className="meta">File: {fileName}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {hasRows ? (
          <>
            <div className="actions">
              <button className="action-btn" type="button" onClick={handleUpdateAll} disabled={loadingAll}>
                {loadingAll ? 'Dang cap nhat tat ca...' : 'Cap nhat tat ca'}
              </button>
              <label className="delay-control">
                <span>Delay (s)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={delaySeconds}
                  onChange={(event) => setDelaySeconds(event.target.value)}
                  disabled={loadingAll}
                />
              </label>
              <button
                className="action-btn danger"
                type="button"
                onClick={handleCancelUpdateAll}
                disabled={!loadingAll}
              >
                Huy cap nhat
              </button>
              <span className="meta">
                Tong dong hien thi: {visibleRows.length}/{rows.length}
              </span>
            </div>

            {processNote ? <p className="process-note">{processNote}</p> : null}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map((key) => (
                      <th key={key}>{getColumnLabel(key)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, rowIndex) => (
                    <tr key={row.id}>
                      {TABLE_COLUMNS.map((key) => (
                        <td key={`${row.id}-${key}`}>{renderOrderCell(row, key, rowIndex)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visibleRows.length ? <p className="muted">Khong co order hop le de hien thi.</p> : null}
          </>
        ) : (
          <p className="muted">Chua co du lieu. Vui long upload file Excel.</p>
        )}
        {imagePreview ? (
          <div
            className="image-preview-layer"
            style={getImagePreviewPosition(imagePreview.x, imagePreview.y)}
          >
            <img src={imagePreview.src} alt="preview" className="image-preview-large" />
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default App;
