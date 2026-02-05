import React, { useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * Home page with top bar and upload flow.
 * - Top bar matches login/signup gradient.
 * - User menu shows icon + email prefix and dropdown (Profile/Settings).
 * - Main card: file type selector (PDF/Image/.txt) + drag/drop + picker upload + Extract button.
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

  const email = useMemo(() => window.localStorage.getItem('auth.email') || '', []);
  const emailPrefix = useMemo(() => getEmailPrefix(email), [email]);

  const accept = useMemo(() => {
    const ft = FILE_TYPES.find((t) => t.key === selectedType);
    return ft ? ft.accept : '*/*';
  }, [selectedType]);

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

  const onExtract = () => {
    // UI-only scaffold. Hook backend integration later.
    // eslint-disable-next-line no-console
    console.log('Extract contents clicked', { selectedType, file });
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

          <button className="homeExtractButton" type="button" disabled={!file} onClick={onExtract}>
            Extract contents
          </button>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
