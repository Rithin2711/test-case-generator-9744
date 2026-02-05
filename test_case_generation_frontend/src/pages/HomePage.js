import React, { useEffect, useMemo, useRef, useState } from 'react';
// Uses REACT_APP_API_BASE (preferred) for /extract; keeps enhanced diagnostics.
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const FILE_TYPES = [
  { key: 'pdf', label: 'PDF', accept: 'application/pdf' },
  { key: 'image', label: 'Image', accept: 'image/*' },
  { key: 'txt', label: '.txt', accept: 'text/plain,.txt' },
];

function getEmailPrefix(email) {
  const value = String(email || '').trim();
  const at = value.indexOf('@');
  if (at <= 0) return value || 'user';
  return value.slice(0, at);
}

function safeJoinUrl(base, path) {
  const b = String(base || '').trim();
  const p = String(path || '').trim();
  if (!b) return p;
  if (!p) return b;
  if (b.endsWith('/') && p.startsWith('/')) return `${b}${p.slice(1)}`;
  if (!b.endsWith('/') && !p.startsWith('/')) return `${b}/${p}`;
  return `${b}${p}`;
}

function isProbablyJsonResponse(contentType) {
  return String(contentType || '').toLowerCase().includes('application/json');
}

function tryExtractTextFromJson(json) {
  if (json == null) return '';
  if (typeof json === 'string') return json;

  if (typeof json === 'object') {
    // Common shapes: { text }, { extracted_text }, { content }, { data: { text } }, etc.
    const candidates = [
      json.text,
      json.extracted_text,
      json.extractedText,
      json.content,
      json.result,
      json.output,
      json.data?.text,
      json.data?.content,
      json.data?.result,
    ].filter((v) => typeof v === 'string' && v.trim().length > 0);

    if (candidates.length > 0) return candidates[0];

    // As a fallback, display the JSON itself.
    try {
      return JSON.stringify(json, null, 2);
    } catch {
      return String(json);
    }
  }

  return String(json);
}

/**
 * Home page with top bar and upload flow.
 * - Top bar matches login/signup gradient.
 * - User menu shows icon + email prefix and dropdown (Profile/Settings).
 * - Main card: file type selector (PDF/Image/.txt) + drag/drop + picker upload + Extract button.
 * - After extraction: show extracted contents in a scrollable container and a "Generate scenario" button.
 */

// PUBLIC_INTERFACE
function HomePage() {
  /** This is a public component. */
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedType, setSelectedType] = useState(FILE_TYPES[0].key);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [rawResponse, setRawResponse] = useState(null);

  const email = useMemo(() => window.localStorage.getItem('auth.email') || '', []);
  const emailPrefix = useMemo(() => getEmailPrefix(email), [email]);

  const accept = useMemo(() => {
    const ft = FILE_TYPES.find((t) => t.key === selectedType);
    return ft ? ft.accept : '*/*';
  }, [selectedType]);

  const apiBaseUrl = useMemo(() => {
    // Prefer explicit API_BASE as requested; fall back to BACKEND_URL for compatibility with prior setups.
    // Note: CRA exposes only REACT_APP_* env vars at build time.
    return process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || '';
  }, []);

  const buildExtractDiagnostics = ({ url, fileToSend, response, responseBodySnippet, error }) => {
    /**
     * Build a compact diagnostic payload to help debug “Failed to fetch” issues:
     * - Wrong URL / missing env var
     * - CORS blocked
     * - Mixed-content (http vs https)
     * - Network/DNS failure
     * - Backend returned non-2xx with a helpful error body
     */
    const safeHeaders = {};
    try {
      // Browsers may restrict access to some headers; guard accordingly.
      response?.headers?.forEach?.((value, key) => {
        safeHeaders[key] = value;
      });
    } catch {
      // ignore
    }

    return {
      request: {
        url,
        method: 'POST',
        file: fileToSend
          ? { name: fileToSend.name, type: fileToSend.type, size: fileToSend.size }
          : null,
        file_type: selectedType,
        apiBaseUrl,
      },
      response: response
        ? {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            type: response.type, // e.g. 'cors', 'basic', 'opaque'
            redirected: response.redirected,
            url: response.url,
            headers: safeHeaders,
          }
        : null,
      responseBodySnippet: responseBodySnippet || '',
      error: error
        ? {
            name: error.name,
            message: error.message,
            // stack is often present in dev builds
            stack: error.stack,
          }
        : null,
      runtime: {
        locationOrigin: window.location?.origin,
        userAgent: navigator.userAgent,
      },
    };
  };

  useEffect(() => {
    // Minimal "auth guard": if no stored email, return to login.
    if (!email) navigate('/login', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    const onDocClick = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest?.('.homeUserMenu')) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const onPickFile = () => fileInputRef.current?.click();

  const onFilesSelected = (files) => {
    const f = files && files.length ? files[0] : null;
    if (!f) return;
    setFile(f);

    // Clear previous output when choosing a new file
    setExtractError('');
    setExtractedText('');
    setRawResponse(null);
  };

  const onInputChange = (e) => onFilesSelected(e.target.files);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const dropped = e.dataTransfer?.files;
    if (!dropped || dropped.length === 0) return;
    onFilesSelected(dropped);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateBeforeExtract = () => {
    if (!file) return 'Please choose a file first.';
    if (!apiBaseUrl) {
      return 'Backend URL is not configured. Set REACT_APP_BACKEND_URL (or REACT_APP_API_BASE) in the environment.';
    }
    return '';
  };

  const onExtract = async () => {
    const validationError = validateBeforeExtract();
    if (validationError) {
      setExtractError(validationError);
      return;
    }

    setIsExtracting(true);
    setExtractError('');
    setExtractedText('');
    setRawResponse(null);

    // eslint-disable-next-line no-console
    console.debug('[extract] starting', {
      apiBaseUrl,
      selectedType,
      file: file ? { name: file.name, type: file.type, size: file.size } : null,
    });

    let res = null;
    let parsedPayload = null;

    try {
      const url = safeJoinUrl(apiBaseUrl, '/extract');

      // eslint-disable-next-line no-console
      console.debug('[extract] about to send request', {
        url,
        apiBaseUrl,
        fileType: selectedType,
        file: file ? { name: file.name, size: file.size, type: file.type } : null,
      });

      const formData = new FormData();
      // Use "file" as the field name (most common backend convention).
      // If backend expects a different key, adjust here.
      formData.append('file', file);

      // Include selectedType as optional metadata (backend may ignore it).
      formData.append('file_type', selectedType);

      res = await fetch(url, { method: 'POST', body: formData });

      // eslint-disable-next-line no-console
      console.debug('[extract] fetch resolved (response received)', {
        status: res.status,
        ok: res.ok,
        headers: {
          'content-type': res.headers.get('content-type'),
          'content-length': res.headers.get('content-length'),
          'x-request-id': res.headers.get('x-request-id'),
          'x-correlation-id': res.headers.get('x-correlation-id'),
        },
      });

      const contentType = res.headers.get('content-type') || '';

      // Prefer reading text first so we can log a snippet even when JSON parsing fails.
      const rawText = await res.text();
      const responseBodySnippet = rawText.slice(0, 1200);

      if (isProbablyJsonResponse(contentType)) {
        try {
          parsedPayload = rawText ? JSON.parse(rawText) : null;

          // eslint-disable-next-line no-console
          console.debug('[extract] parsing succeeded', {
            parsedAs: 'json',
            extractedLength: tryExtractTextFromJson(parsedPayload).length,
          });
        } catch (jsonErr) {
          const diag = buildExtractDiagnostics({
            url,
            fileToSend: file,
            response: res,
            responseBodySnippet,
            error: jsonErr,
          });
          // eslint-disable-next-line no-console
          console.error('[extract] JSON parse failed; returning raw text instead', diag);

          // eslint-disable-next-line no-console
          console.error('[extract] JSON parse error details', {
            name: jsonErr?.name,
            message: jsonErr?.message,
            responseSnippet: responseBodySnippet,
          });

          parsedPayload = rawText;

          // eslint-disable-next-line no-console
          console.debug('[extract] parsing succeeded', {
            parsedAs: 'text (fallback after JSON parse failure)',
            extractedLength: tryExtractTextFromJson(parsedPayload).length,
          });
        }
      } else {
        parsedPayload = rawText;

        // eslint-disable-next-line no-console
        console.debug('[extract] parsing succeeded', {
          parsedAs: 'text',
          extractedLength: tryExtractTextFromJson(parsedPayload).length,
        });
      }

      if (!res.ok) {
        const msg = tryExtractTextFromJson(parsedPayload);

        const diag = buildExtractDiagnostics({
          url,
          fileToSend: file,
          response: res,
          responseBodySnippet,
          error: new Error(msg || `HTTP ${res.status}`),
        });
        // eslint-disable-next-line no-console
        console.error('[extract] backend returned error', diag);

        // eslint-disable-next-line no-console
        console.error('[extract] error details', {
          name: 'BackendError',
          message: msg || `HTTP ${res.status}`,
          responseSnippet: responseBodySnippet,
        });

        throw new Error(msg || `Extraction failed with status ${res.status}`);
      }

      // eslint-disable-next-line no-console
      console.debug('[extract] success', {
        status: res.status,
        contentType,
        extractedLength: tryExtractTextFromJson(parsedPayload).length,
      });

      setRawResponse(parsedPayload);
      setExtractedText(tryExtractTextFromJson(parsedPayload));
    } catch (err) {
      // Fetch throws TypeError("Failed to fetch") on network errors and CORS blocks.
      const message = String(err?.message || '');

      // eslint-disable-next-line no-console
      console.error('[extract] caught error', {
        name: err?.name,
        message,
      });

      // If we never got a response object, it is almost certainly network/CORS/mixed-content.
      if (!res) {
        const url = safeJoinUrl(apiBaseUrl, '/extract');
        const diag = buildExtractDiagnostics({
          url,
          fileToSend: file,
          response: null,
          responseBodySnippet: '',
          error: err,
        });

        // eslint-disable-next-line no-console
        console.error('[extract] request failed before receiving a response (network/CORS?)', diag);

        const likelyCorsHint =
          message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('networkerror')
            ? 'Possible causes: CORS blocked, backend unreachable, DNS failure, or mixed-content (http vs https). Check browser devtools Network/Console.'
            : '';

        setExtractError(
          [message || 'Extraction failed.', likelyCorsHint, `Request URL: ${url}`].filter(Boolean).join(' ')
        );
      } else {
        // We got a response but still ended up here due to parsing or thrown error.
        const url = safeJoinUrl(apiBaseUrl, '/extract');
        const responseBodySnippet =
          typeof parsedPayload === 'string' ? parsedPayload.slice(0, 1200) : tryExtractTextFromJson(parsedPayload);

        const diag = buildExtractDiagnostics({
          url,
          fileToSend: file,
          response: res,
          responseBodySnippet,
          error: err,
        });

        // eslint-disable-next-line no-console
        console.error('[extract] failed after receiving response', diag);

        // eslint-disable-next-line no-console
        console.error('[extract] error details (post-response)', {
          name: err?.name,
          message: err?.message,
          responseSnippet: responseBodySnippet,
        });

        setExtractError(message || 'Extraction failed.');
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const onGenerateScenario = () => {
    // Placeholder hook for next step.
    // eslint-disable-next-line no-console
    console.log('Generate scenario clicked', { extractedText, rawResponse });
  };

  const onLogout = () => {
    window.localStorage.removeItem('auth.email');
    navigate('/login', { replace: true });
  };

  return (
    <div className="homePage" role="main">
      <header className="homeHeader" aria-label="Tool header">
        <div className="homeHeaderInner">
          <div className="homeToolName" aria-label="Tool name">
            ToolX
          </div>

          <div className="homeUserMenu" aria-label="User menu">
            <button
              type="button"
              className="homeUserButton"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="homeUserIcon" aria-hidden="true">
                {/* simple inline "user" glyph */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M4 22c0-4.418 3.582-8 8-8s8 3.582 8 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="homeUserText" title={email || emailPrefix}>
                {emailPrefix}
              </span>
              <span className="homeUserChevron" aria-hidden="true">
                ▾
              </span>
            </button>

            {menuOpen ? (
              <div className="homeDropdown" role="menu" aria-label="User dropdown">
                <button
                  type="button"
                  className="homeDropdownItem"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    // eslint-disable-next-line no-console
                    console.log('Profile clicked (stub)');
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="homeDropdownItem"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    // eslint-disable-next-line no-console
                    console.log('Settings clicked (stub)');
                  }}
                >
                  Settings
                </button>
                <div className="homeDropdownDivider" role="separator" />
                <button type="button" className="homeDropdownItem danger" role="menuitem" onClick={onLogout}>
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="homeContent" aria-label="Home content">
        <div className="homeCard" role="region" aria-label="File upload card">
          <h1 className="homeTitle">Upload a file</h1>

          <div className="homeTypeRow" aria-label="File type selector">
            <div className="homeTypeLabel">Choose file type</div>
            <div className="homeTypeSegment" role="radiogroup" aria-label="File type">
              {FILE_TYPES.map((t) => (
                <label key={t.key} className={`homeTypeOption ${selectedType === t.key ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="fileType"
                    value={t.key}
                    checked={selectedType === t.key}
                    onChange={() => {
                      setSelectedType(t.key);
                      setFile(null); // clear selection when switching type
                      setExtractError('');
                      setExtractedText('');
                      setRawResponse(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div
            className={`homeDropZone ${isDragging ? 'dragging' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            role="button"
            tabIndex={0}
            aria-label="Drag and drop upload area"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onPickFile();
            }}
            onClick={onPickFile}
          >
            <div className="homeDropInner">
              <div className="homeDropIcon" aria-hidden="true">
                ⬆
              </div>
              <div className="homeDropText">
                <div className="homeDropPrimary">Drag and drop your file here</div>
                <div className="homeDropSecondary">or click to upload from your device</div>
              </div>

              <div className="homeDropMeta" aria-label="Selected file">
                {file ? (
                  <div className="homeFilePill">
                    <span className="homeFileName" title={file.name}>
                      {file.name}
                    </span>
                    <button
                      type="button"
                      className="homeClearFile"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setExtractError('');
                        setExtractedText('');
                        setRawResponse(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      aria-label="Remove selected file"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <span className="homeHint">Accepted: {accept}</span>
                )}
              </div>

              <button type="button" className="homePickButton" onClick={onPickFile}>
                Choose file
              </button>

              <input
                ref={fileInputRef}
                className="homeHiddenInput"
                type="file"
                accept={accept}
                onChange={onInputChange}
              />
            </div>
          </div>

          <button className="homeExtractButton" type="button" disabled={!file || isExtracting} onClick={onExtract}>
            {isExtracting ? 'Extracting…' : 'Extract contents'}
          </button>

          {extractError ? (
            <div className="homeStatusMessage homeStatusError" role="alert">
              {extractError}
            </div>
          ) : null}

          {extractedText ? (
            <div className="homeResults" role="region" aria-label="Extracted contents">
              <div className="homeResultsHeader">
                <div className="homeResultsTitle">Extracted contents</div>
                <div className="homeResultsMeta">
                  {file?.name ? <span className="homeResultsPill">{file.name}</span> : null}
                </div>
              </div>

              <pre className="homeResultsBody">{extractedText}</pre>

              <button type="button" className="homeScenarioButton" onClick={onGenerateScenario}>
                Generate scenario
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
