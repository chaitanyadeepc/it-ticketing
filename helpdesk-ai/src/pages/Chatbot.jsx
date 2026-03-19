import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import ChatBubble, { TypingIndicator } from '../components/ChatBubble';
import api from '../api/api';
import { logActivity } from '../utils/activityLog';
import {
  HiComputerDesktop, HiCodeBracket, HiSignal, HiKey, HiEnvelope,
  HiCircleStack, HiSpeakerWave, HiDevicePhoneMobile, HiPrinter, HiShieldCheck,
  HiCheckCircle, HiXCircle, HiPencilSquare, HiClipboardDocumentList, HiArrowPath,
  HiTicket, HiWifi, HiLockClosed,
} from 'react-icons/hi2';

const CATEGORY_ICONS = {
  'Hardware':              HiComputerDesktop,
  'Software & Apps':       HiCodeBracket,
  'Network & Connectivity':HiSignal,
  'Access & Identity':     HiKey,
  'Email & Collaboration': HiEnvelope,
  'Data & Storage':        HiCircleStack,
  'Audio & Video':         HiSpeakerWave,
  'Mobile & Devices':      HiDevicePhoneMobile,
  'Printing & Scanning':   HiPrinter,
  'Security & Compliance': HiShieldCheck,
};

const ts = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const now = () => Date.now(); // epoch ms for live timestamp aging

// ── Session storage helpers ────────────────────────────────────────────────────
const SESSION_KEY = 'hd_chat_session';
const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};
const saveSession = (s) => {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* quota */ }
};
const clearSession = () => sessionStorage.removeItem(SESSION_KEY);

// ── Chat history (localStorage — persists across tabs/sessions) ───────────────
const HISTORY_KEY = 'hd_chat_history';
const getHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
};
const saveToHistory = (entry) => {
  try {
    const hist = getHistory();
    const idx = hist.findIndex(h => h.id === entry.id);
    if (idx >= 0) hist[idx] = entry; else hist.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 40)));
  } catch {}
};

// ─────────────────────────────────────────────────────────────────────────────
// Category configuration — 10 categories with sub-types & guided questions
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORIES = {
  Hardware: {
    color: '#f59e0b',
    keywords: /laptop|desktop|keyboard|mouse|monitor|printer|screen|charger|headset|webcam|docking|battery|power|display|cable|hardware/,
    subTypes: ['Laptop / Desktop', 'Monitor / Display', 'Keyboard or Mouse', 'Printer', 'Headset / Webcam', 'Docking Station / Charger', 'Other Hardware'],
    subTypeQuestion: 'Which type of hardware is affected?\n\nPick one below or type your device:',
    detailQuestions: {
      'Laptop / Desktop': 'A few quick questions:\n\n• Does it power on? Any error screen or beep codes?\n• When did it last work normally?\n• Any recent physical damage (drop / spill)?',
      'Monitor / Display': 'Display issue details:\n\n• Screen blank, flickering, or showing artefacts?\n• Laptop screen or external monitor?\n• Does it affect all inputs or just one?',
      'Keyboard or Mouse': 'Input device info:\n\n• Wired or wireless?\n• All keys/buttons affected or just specific ones?\n• Tried a different USB port or new batteries?',
      'Printer': 'Printer details:\n\n• Make and model of the printer?\n• Connection issue, paper jam, or print quality?\n• USB or network printer?',
      'Headset / Webcam': 'Peripheral info:\n\n• Audio input, audio output, or video issue?\n• Appears in Device Manager / System Settings?\n• Which app is affected?',
      'Docking Station / Charger': 'Power / dock check:\n\n• Is the laptop charging at all?\n• All dock ports affected or specific ones?\n• Tried a different power socket?',
    },
    detailChips: ['Just started today', 'After a drop / spill', 'After OS update', 'Works intermittently', 'Never worked since new'],
    priorityBoost: { 'Laptop / Desktop': 'High' },
  },

  'Software & Apps': {
    color: '#6366f1',
    keywords: /software|app|application|install|crash|update|program|license|office|excel|word|teams app|browser|chrome|edge|firefox|activation|365/,
    subTypes: ['Microsoft Office / 365', 'Web Browser', 'Company / Internal App', 'Operating System', 'Software Installation', 'License / Activation', 'Other Software'],
    subTypeQuestion: 'Which software or application is having issues?\n\nSelect below or type the app name:',
    detailQuestions: {
      'Microsoft Office / 365': 'Office issue:\n\n• Which app — Word / Excel / Outlook / Teams / PowerPoint?\n• Crashes on open or during use?\n• Any error code shown?',
      'Web Browser': 'Browser details:\n\n• Which browser and version?\n• All websites or a specific one?\n• Cleared cache & cookies, or tried a different browser?',
      'Company / Internal App': 'Internal app info:\n\n• Application name?\n• Which action triggers the problem?\n• Are other team members also affected?',
      'Operating System': 'OS details:\n\n• Windows or macOS? Which version?\n• BSOD / kernel panic, or a specific error message?\n• Started after a system update?',
      'Software Installation': 'Installation help:\n\n• What are you trying to install?\n• Exact error during installation?\n• Do you have local admin rights?',
      'License / Activation': 'Licensing info:\n\n• Which product needs a license?\n• Exact message shown (e.g. "product not activated")?\n• New install or reinstall on existing machine?',
    },
    detailChips: ['Error code shown on screen', 'Crashes on every launch', 'Only affects my account', 'Affects the whole team', 'Regression after update'],
    priorityBoost: { 'Company / Internal App': 'High', 'License / Activation': 'High', 'Operating System': 'High' },
  },

  'Network & Connectivity': {
    color: '#06b6d4',
    keywords: /network|wifi|internet|vpn|connection|disconnect|ethernet|bandwidth|lan|router|firewall|proxy|dns|slow internet|no internet|connectivity/,
    subTypes: ['No Internet / WiFi', 'VPN Not Working', 'Slow Connection', 'Wired / Ethernet', 'Remote Access', 'Firewall / Proxy Block', 'Other Network'],
    subTypeQuestion: 'What type of network issue are you experiencing?\n\nSelect below or describe the problem:',
    detailQuestions: {
      'No Internet / WiFi': 'Connectivity checks:\n\n• Can you see the WiFi network in the list?\n• Are other devices on the same network affected?\n• Tried forgetting & reconnecting, or restarting your router?',
      'VPN Not Working': 'VPN details:\n\n• Which VPN client? (Cisco AnyConnect / GlobalProtect / OpenVPN / Other)\n• Failing to connect, or connects then drops?\n• On-site or working remotely?',
      'Slow Connection': 'Speed info:\n\n• Speed test result at fast.com?\n• Slow on all sites or specific services only?\n• Wired or wireless connection?',
      'Wired / Ethernet': 'Ethernet issue:\n\n• Port light up on the wall socket and computer?\n• Tried a different cable?\n• Showing "Unidentified Network" or "No Internet"?',
      'Remote Access': 'Remote access info:\n\n• Tool in use — RDP / Citrix / VPN / VMware Horizon?\n• Specific error message?\n• Local internet working fine?',
      'Firewall / Proxy Block': 'Firewall / proxy:\n\n• Which site or service is blocked?\n• Browser error shown (e.g. ERR_CONNECTION_REFUSED)?\n• Blocked for all staff or just you?',
    },
    detailChips: ['All devices affected', 'Only my device', 'Started after office move', 'After system update', 'Intermittent drops throughout day'],
    priorityBoost: { 'No Internet / WiFi': 'High', 'VPN Not Working': 'High', 'Remote Access': 'High' },
  },

  'Access & Identity': {
    color: '#a855f7',
    keywords: /password|access|login|account|lock|permission|reset|mfa|two.factor|2fa|sso|single sign|active directory|okta|locked out|user account/,
    subTypes: ['Password Reset', 'Account Locked Out', 'MFA / 2FA Problem', 'Permission Request', 'New User Onboarding', 'SSO / Single Sign-On', 'Other Access'],
    subTypeQuestion: 'What type of access issue do you have?\n\nSelect below:',
    detailQuestions: {
      'Password Reset': 'Password reset info:\n\n• Which system / application (Windows login, Office 365, Internal App)?\n• Can you receive emails to your registered address?\n• Is this an urgent lockout right now?',
      'Account Locked Out': 'Account locked — urgent info needed:\n\n• Which account / system is locked?\n• Do you know your last correct password?\n• When did the lockout happen?',
      'MFA / 2FA Problem': 'MFA issue:\n\n• Which MFA app or method? (Authenticator / Duo / SMS / Email OTP)\n• New phone or lost access to the app?\n• Code invalid, not arriving, or app deleted?',
      'Permission Request': 'Permission details:\n\n• Which folder, system, or application?\n• Level of access needed — read / write / admin?\n• Do you have manager approval for this?',
      'New User Onboarding': 'New user setup:\n\n• Employee name and start date?\n• Which systems and apps are required?\n• Has an onboarding request been raised by HR?',
      'SSO / Single Sign-On': 'SSO issue:\n\n• Which application is failing SSO?\n• Error message shown (e.g. SAML error, redirect loop)?\n• Does direct (non-SSO) login work?',
    },
    detailChips: ['Locked out urgently — need help now', 'MFA app lost / changed phone', 'Need folder access for project', 'New joiner device setup', 'SSO redirect loop issue'],
    priorityBoost: { 'Account Locked Out': 'Critical', 'MFA / 2FA Problem': 'High', 'SSO / Single Sign-On': 'High' },
  },

  'Email & Collaboration': {
    color: '#22c55e',
    keywords: /email|mail|outlook|teams|slack|zoom|calendar|meeting|invite|attachment|mailbox|distribution|sharepoint|onedrive|shared mailbox/,
    subTypes: ['Outlook / Email Problem', 'Microsoft Teams', 'Zoom / Video Calls', 'Calendar & Scheduling', 'SharePoint / OneDrive', 'Distribution List', 'Other Collaboration'],
    subTypeQuestion: 'Which collaboration tool is having issues?\n\nSelect below:',
    detailQuestions: {
      'Outlook / Email Problem': 'Email issue details:\n\n• Can you send, receive, or both affected?\n• Web browser (OWA) or desktop Outlook app?\n• Any sync errors or error messages on screen?',
      'Microsoft Teams': 'Teams issue:\n\n• Calls, messaging, meetings, or file sharing?\n• Others in your org also affected?\n• Specific error code or action that fails?',
      'Zoom / Video Calls': 'Video call details:\n\n• Can you join but not host, or both fail?\n• Audio, video, or screen-share issue?\n• Device and OS?',
      'Calendar & Scheduling': 'Calendar issue:\n\n• Creating, viewing, or sharing calendars?\n• Outlook calendar or another tool?\n• Meeting invites not sending or not appearing?',
      'SharePoint / OneDrive': 'SharePoint / OneDrive:\n\n• Accessing, syncing, or sharing files affected?\n• Any permission error message?\n• Which site or folder URL?',
      'Distribution List': 'Distribution list:\n\n• List name?\n• Cannot send to it, or not receiving from it?\n• New list or existing one that stopped working?',
    },
    detailChips: ['Outlook not syncing at all', 'Teams calls dropping mid-call', 'Calendar events gone missing', "OneDrive won't sync", "Can't join or schedule meeting"],
    priorityBoost: { 'Outlook / Email Problem': 'High' },
  },

  'Data & Storage': {
    color: '#f97316',
    keywords: /file|folder|data|storage|drive|backup|nas|shared drive|lost data|deleted file|corrupt|disk full|usb|external drive|cloud storage/,
    subTypes: ['File / Folder Access Denied', 'Data Lost or Deleted', 'Drive or Disk Full', 'Backup & Restore', 'USB / External Drive', 'Cloud Storage Issue', 'Other Data'],
    subTypeQuestion: 'What type of data or storage issue?\n\nSelect below:',
    detailQuestions: {
      'File / Folder Access Denied': 'Access denied details:\n\n• Full path of the file or folder?\n• Exact error message shown?\n• Were you able to access this before?',
      'Data Lost or Deleted': 'Data recovery — act quickly:\n\n• When was the data last seen?\n• File types affected (documents, emails, etc.)?\n• Checked Recycle Bin / OneDrive version history / Trash?',
      'Drive or Disk Full': 'Storage audit:\n\n• Which drive? (C: drive, shared network drive, email mailbox)\n• Current used/total capacity shown?\n• Run Disk Cleanup or Storage Sense already?',
      'Backup & Restore': 'Backup info:\n\n• Which backup solution? (Windows Backup / cloud backup / Veeam)\n• Recovery point needed — which date?\n• Single file restore or full system restore?',
      'USB / External Drive': 'External drive details:\n\n• Recognised by the OS at all?\n• File system type? (NTFS, exFAT, FAT32)\n• Any unusual sounds (clicking, grinding)?',
      'Cloud Storage Issue': 'Cloud storage:\n\n• Which service? (OneDrive, Google Drive, Dropbox, SharePoint)\n• Files not syncing, or storage quota exceeded?\n• Error notification shown in the app?',
    },
    detailChips: ['Critical work files missing', 'Accidentally deleted files', 'Need restore from backup', 'USB drive not showing up', 'Cloud sync paused / failed'],
    priorityBoost: { 'Data Lost or Deleted': 'Critical', 'Backup & Restore': 'High' },
  },

  'Audio & Video': {
    color: '#ec4899',
    keywords: /audio|sound|microphone|mic|camera|webcam|speaker|headphone|video|screen share|hdmi|bluetooth audio|no sound|echo|feedback|meeting room av/,
    subTypes: ['Microphone / Audio Input', 'Speaker / Audio Output', 'Webcam / Camera', 'Screen Sharing', 'Bluetooth Audio Device', 'Meeting Room AV', 'Other AV'],
    subTypeQuestion: 'Which audio or video component is affected?\n\nSelect below:',
    detailQuestions: {
      'Microphone / Audio Input': 'Microphone details:\n\n• Detected in sound / system settings?\n• Works in one app but fails in another?\n• Built-in microphone or external (USB / 3.5mm / Bluetooth)?',
      'Speaker / Audio Output': 'Speaker / audio out:\n\n• No sound at all, or distorted / one-sided?\n• Does the volume slider respond?\n• Checked default playback device in sound settings?',
      'Webcam / Camera': 'Camera details:\n\n• Appears in Device Manager / System Settings?\n• Works in one app but fails in others?\n• Built-in laptop camera or external USB webcam?',
      'Screen Sharing': 'Screen sharing issue:\n\n• Which app — Teams / Zoom / Webex / Google Meet?\n• Screen appears black to others, or fails to start sharing?\n• Full desktop share or specific application window?',
      'Bluetooth Audio Device': 'Bluetooth device:\n\n• Device type — headset, speaker, microphone?\n• Paired but no audio, or will not pair at all?\n• Restarted Bluetooth on both the device and computer?',
      'Meeting Room AV': 'Meeting room AV:\n\n• Which room name / floor?\n• Which equipment — TV, projector, conference phone, PC?\n• Specific input failing or the whole system down?',
    },
    detailChips: ['No sound in video calls', 'Echo or feedback in calls', 'Camera shows black screen', "Can't start screen share", "Bluetooth won't connect"],
    priorityBoost: {},
  },

  'Mobile & Devices': {
    color: '#84cc16',
    keywords: /mobile|phone|tablet|ipad|iphone|android|mdm|intune|work profile|mobile app|byod|device enrol|enroll|company portal/,
    subTypes: ['Work Phone Issue', 'Tablet / iPad', 'MDM / Intune Enrolment', 'Mobile App Problem', 'BYOD Personal Device Setup', 'Lost / Stolen Device', 'Other Mobile'],
    subTypeQuestion: 'What type of mobile or device issue?\n\nSelect below:',
    detailQuestions: {
      'Work Phone Issue': 'Work phone details:\n\n• Make and model of the device?\n• Calls, email, or a specific app affected?\n• Hardware damage or purely software issue?',
      'Tablet / iPad': 'Tablet info:\n\n• Device model and OS version?\n• Company-owned or personal device?\n• Which apps or access are affected?',
      'MDM / Intune Enrolment': 'MDM enrolment info:\n\n• Device OS — iOS / Android / Windows?\n• Error message from Company Portal app?\n• First-time enrolment or re-enrolment after wipe?',
      'Mobile App Problem': 'Mobile app issue:\n\n• App name?\n• Crashes, login failure, or missing features?\n• App version? Tried uninstalling and reinstalling?',
      'BYOD Personal Device Setup': 'BYOD setup:\n\n• Device type and OS version?\n• Which corporate apps do you need access to?\n• Company Portal / MDM agent installed yet?',
      'Lost / Stolen Device': 'Lost / stolen device — urgent:\n\n• When and where was it last seen?\n• Immediate remote wipe needed?\n• Is the device encrypted and passcode-protected?',
    },
    detailChips: ['MDM enrolment failing', 'Work email not syncing on phone', 'Lost device — remote wipe needed', 'App crashing on mobile', 'BYOD first-time setup help'],
    priorityBoost: { 'Lost / Stolen Device': 'Critical' },
  },

  'Printing & Scanning': {
    color: '#64748b',
    keywords: /print|printer|scanner|scan|copier|toner|ink|paper jam|print queue|print job|fax|photocopier/,
    subTypes: ['Print Job Stuck in Queue', 'Printer Shows Offline', 'Poor Print Quality', 'Paper Jam', 'Scanner Not Working', 'Toner / Ink Request', 'Other Printing'],
    subTypeQuestion: 'What type of printing or scanning issue?\n\nSelect below:',
    detailQuestions: {
      'Print Job Stuck in Queue': 'Print queue info:\n\n• Printer name and location / floor?\n• How many jobs are stuck?\n• Tried clearing the print spooler (services.msc)?',
      'Printer Shows Offline': 'Offline printer details:\n\n• USB or network (IP) connected printer?\n• Any status lights or error codes on the printer panel?\n• Appears in Devices & Printers settings?',
      'Poor Print Quality': 'Print quality issue:\n\n• Faded, streaked, smeared, or incorrect colours?\n• Estimated toner / ink level shown?\n• Laser or inkjet printer?',
      'Paper Jam': 'Paper jam info:\n\n• Paper fully removed from all trays and internal paths?\n• Which area jammed — feed tray, inside, or output?\n• Paper size and weight being used?',
      'Scanner Not Working': 'Scanner details:\n\n• Standalone scanner or multifunction printer (MFP)?\n• Detected by the scanning software?\n• Error shown, or just no response?',
      'Toner / Ink Request': 'Consumable request:\n\n• Printer make and full model number?\n• Cartridge part number if shown?\n• Urgent (print quality failing now) or advance replenishment?',
    },
    detailChips: ['Printer offline after reboot', 'Print queue stuck / frozen', 'Toner running very low', 'Paper jam removed but error persists', 'Scan-to-email not working'],
    priorityBoost: {},
  },

  'Security & Compliance': {
    color: '#ef4444',
    keywords: /virus|malware|phishing|ransomware|suspicious email|hacked|breach|compromise|security alert|spam|scam|antivirus|crowdstrike|defender alert|compliance|gdpr|data leak|unauthorized access/,
    subTypes: ['Phishing / Suspicious Email', 'Malware or Virus Alert', 'Unauthorised Account Access', 'Possible Data Breach', 'Compliance Question', 'Antivirus / EDR Alert', 'Other Security'],
    subTypeQuestion: 'What type of security concern are you reporting?\n\nThis will be treated with high priority:',
    detailQuestions: {
      'Phishing / Suspicious Email': 'Phishing report — important steps first:\n\n• Do NOT click any links or open attachments\n• Who sent it and what does it ask you to do?\n• Have you already clicked anything or entered credentials?',
      'Malware or Virus Alert': 'Malware concern — please act now:\n\n• What suspicious behaviour? (pop-ups, slow PC, files renamed)\n• Antivirus warning shown? What threat name?\n• Please isolate the device from the network if possible',
      'Unauthorised Account Access': 'Account compromised — take action:\n\n• Which account or system was accessed?\n• When did you notice the unauthorised activity?\n• Change your password immediately and enable MFA now',
      'Possible Data Breach': 'CRITICAL — Potential data breach:\n\n• What data may have been exposed? (personal, financial, health?)\n• How many individuals could be affected?\n• We will escalate to the Security & Compliance team immediately',
      'Compliance Question': 'Compliance query:\n\n• Which regulation? (GDPR / HIPAA / PCI-DSS / ISO27001)\n• Specific policy question or an active incident?\n• Are you reporting an issue or seeking guidance?',
      'Antivirus / EDR Alert': 'AV / EDR alert details:\n\n• Which security tool? (Defender / CrowdStrike / SentinelOne)\n• Threat name and severity level shown?\n• Has the file been quarantined or the alert resolved?',
    },
    detailChips: ["Got phishing email — didn't click", 'Clicked suspicious link accidentally', 'Antivirus blocked / quarantined threat', 'Unusual sign-in to my account', 'Need security policy guidance'],
    priorityBoost: {
      'Phishing / Suspicious Email': 'High',
      'Malware or Virus Alert': 'Critical',
      'Unauthorised Account Access': 'Critical',
      'Possible Data Breach': 'Critical',
    },
  },
};

const CATEGORY_NAMES = Object.keys(CATEGORIES);

const detectCategory = (text) => {
  const t = text.toLowerCase();
  for (const [name, cfg] of Object.entries(CATEGORIES)) {
    if (cfg.keywords.test(t)) return name;
  }
  return null;
};

const detectPriority = (text, category, subType) => {
  const t = text.toLowerCase();
  if (/urgent|critical|asap|emergency|breach|hacked|ransomware|stolen|lost device|locked out now|cannot work at all|data loss/.test(t))
    return 'Critical';
  const cfg = category ? CATEGORIES[category] : null;
  if (cfg && subType && cfg.priorityBoost[subType]) return cfg.priorityBoost[subType];
  if (/slow|delay|issue|problem|error|crash|fail|not working|broken/.test(t)) return 'High';
  return 'Medium';
};

const PRIORITY_BG = {
  Critical: 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]',
  High: 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]',
  Medium: 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6]',
  Low: 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]',
};

// ── Step progress (5 steps) ───────────────────────────────────────────────────
const StepProgress = ({ currentStep, compact = false }) => {
  const steps = [
    { id: 1, label: 'Describe' },
    { id: 2, label: 'Sub-type' },
    { id: 3, label: 'Details' },
    { id: 4, label: 'Confirm' },
    { id: 5, label: 'Done' },
  ];
  if (compact) {
    // Thin progress bar for mobile header
    const pct = Math.round(((currentStep - 1) / (steps.length - 1)) * 100);
    const stepLabel = steps[currentStep - 1]?.label || 'Done';
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-[#a1a1aa]">
            Step {currentStep} of {steps.length} — {stepLabel}
          </span>
          <span className="text-[10px] text-[#52525b]">{pct}%</span>
        </div>
        <div className="h-1 rounded-full bg-[#27272a] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#3b82f6] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-300 ${
                step.id < currentStep
                  ? 'bg-[#3b82f6] text-white'
                  : step.id === currentStep
                  ? 'bg-[#3b82f6] text-white ring-2 ring-[#3b82f6]/30 ring-offset-1 ring-offset-[#18181b]'
                  : 'bg-[#27272a] text-[#52525b]'
              }`}
            >
              {step.id < currentStep ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <span className={`text-[9px] mt-1 font-medium whitespace-nowrap ${step.id <= currentStep ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-0.5 mb-4 transition-all duration-500 ${step.id < currentStep ? 'bg-[#3b82f6]' : 'bg-[#27272a]'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ── Quick-reply chip ──────────────────────────────────────────────────────────
const QuickReply = ({ label, onClick, variant = 'default' }) => (
  <button
    onClick={() => onClick(label)}
    className={`px-4 py-2.5 min-h-[44px] sm:min-h-[32px] sm:py-1.5 rounded-full border text-[13px] sm:text-[12px] font-medium transition-all duration-150 whitespace-nowrap active:scale-95 ${
      variant === 'warning'
        ? 'border-[#ef4444]/40 text-[#ef4444] bg-[#ef4444]/5 active:bg-[#ef4444]/20'
        : variant === 'success'
        ? 'border-[#22c55e]/40 text-[#22c55e] bg-[#22c55e]/5 active:bg-[#22c55e]/20'
        : 'border-[#3b82f6]/40 text-[#3b82f6] bg-[#3b82f6]/5 hover:bg-[#3b82f6]/15 hover:border-[#3b82f6] active:bg-[#3b82f6]/20'
    }`}
  >
    {label}
  </button>
);

// ── Status colour metadata ───────────────────────────────────────────────────
const STATUS_META = {
  'Open':        { color: '#3b82f6', dot: '🔵' },
  'In Progress': { color: '#f59e0b', dot: '🟡' },
  'Resolved':    { color: '#22c55e', dot: '🟢' },
  'Closed':      { color: '#71717a', dot: '⚫' },
};

// ── Ticket ID quick-select chips ───────────────────────────────────────────────
const TicketIdChips = ({ tickets, onSelect }) => (
  <div className="px-3 sm:px-4 pb-2 pt-2.5 shrink-0 border-t border-[#27272a]">
    <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider mb-2">Your tickets — tap to check status</p>
    <div className="flex flex-wrap gap-1.5">
      {tickets.map((t) => {
        const meta = STATUS_META[t.status] || STATUS_META['Open'];
        return (
          <button
            key={t._id}
            onClick={() => onSelect(t.ticketId)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left active:scale-95 transition-all"
            style={{
              borderColor: `${meta.color}40`,
              background: `${meta.color}08`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
            <span className="text-[12px] font-mono font-semibold" style={{ color: meta.color }}>{t.ticketId}</span>
            <span className="text-[10px] text-[#71717a] hidden sm:inline truncate max-w-[120px]">{t.title?.slice(0, 28)}{(t.title?.length ?? 0) > 28 ? '…' : ''}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// ── Category grid shown at step 1 ─────────────────────────────────────────────
const CategoryGrid = ({ onSelect }) => (
  <div className="border-t border-[#27272a] shrink-0 bg-[#111113]">
    <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider">Choose a category</span>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1.5 px-3 pb-3">
      {CATEGORY_NAMES.map((name) => {
        const cfg = CATEGORIES[name];
        const Icon = CATEGORY_ICONS[name];
        return (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className="flex items-center gap-2.5 px-3 py-3 min-h-[48px] rounded-xl bg-[#1c1c1f] hover:bg-[#27272a] active:scale-[0.97] transition-all text-left border"
            style={{ borderColor: `${cfg.color}20`, borderLeftWidth: 3, borderLeftColor: cfg.color }}
          >
            {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />}
            <span className="text-[11.5px] font-medium text-[#d4d4d8] leading-tight flex-1 min-w-0">{name}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// ── Quick templates ────────────────────────────────────────────────────────────
const TEMPLATES = [
  { label: '🔑 Password Reset',         text: 'I need to reset my password for my Windows/Office 365 account. I am locked out and cannot log in.' },
  { label: '🌐 VPN Not Connecting',     text: 'VPN is not connecting. I am getting an error when trying to connect to the office VPN remotely.' },
  { label: '💻 Laptop Running Slow',    text: 'My laptop is running very slowly. It takes a long time to boot up and applications are freezing.' },
  { label: '📧 Outlook Not Syncing',    text: 'Outlook is not syncing my emails. New messages are not appearing and I cannot send emails.' },
  { label: '🖨️ Printer Offline',        text: 'The printer is showing as offline and I cannot print any documents.' },
  { label: '🔒 Account Locked Out',     text: 'My account has been locked out. I cannot log into my computer or any work applications.' },
  { label: '📱 MFA App Lost',           text: 'I lost access to my MFA authenticator app after changing my phone. I cannot complete two-factor login.' },
  { label: '📁 Cannot Access Files',    text: 'I cannot access files on the shared network drive. I am getting an access denied error.' },
  { label: '🎤 Microphone Not Working', text: 'My microphone is not working in Teams/Zoom calls. Others cannot hear me during meetings.' },
  { label: '🔄 Software Installation',  text: 'I need help installing software on my computer. I do not have permission to install applications.' },
];

const TemplatesPanel = ({ onSelect }) => (
  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 shrink-0">
    <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Quick Templates</p>
    <div className="space-y-0.5">
      {TEMPLATES.map((t) => (
        <button
          key={t.label}
          onClick={() => onSelect(t.text)}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#27272a] transition-colors text-[12px] text-[#71717a] hover:text-[#fafafa] flex items-center gap-2 group"
        >
          <span className="text-[13px]">{t.label.split(' ')[0]}</span>
          <span className="flex-1 truncate">{t.label.split(' ').slice(1).join(' ')}</span>
          <svg className="w-3 h-3 text-[#3f3f46] group-hover:text-[#3b82f6] ml-auto transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ))}
    </div>
  </div>
);

// ── Mobile info drawer (progress + preview + dupes) ─────────────────────────
const MobileInfoDrawer = ({ open, onClose, flowStep, ticketData, similarTickets, setSimilarTickets, onEscalate }) => {
  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#18181b] border-t border-[#3f3f46] rounded-t-2xl max-h-[70vh] overflow-y-auto lg:hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a]">
          <p className="text-[13px] font-semibold text-[#fafafa]">Ticket Details</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#27272a] text-[#71717a] hover:text-[#fafafa] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Progress */}
          <div>
            <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Progress</p>
            <StepProgress currentStep={flowStep} />
          </div>

          {/* Duplicate warning */}
          {similarTickets.length > 0 && flowStep >= 2 && (
            <div className="bg-[#f59e0b]/8 border border-[#f59e0b]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p className="text-[11px] font-semibold text-[#f59e0b] uppercase tracking-wider">Similar Open Tickets</p>
              </div>
              <p className="text-[11.5px] text-[#71717a] mb-2">You may already have an open ticket:</p>
              <div className="space-y-1.5">
                {similarTickets.map((t) => (
                  <a key={t._id} href={`/tickets/${t._id}`}
                    className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-[#27272a] block">
                    <span className="text-[10px] font-mono text-[#3b82f6] shrink-0 mt-0.5">{t.ticketId}</span>
                    <span className="text-[11.5px] text-[#a1a1aa] leading-tight line-clamp-2">{t.title}</span>
                  </a>
                ))}
              </div>
              <button onClick={() => setSimilarTickets([])} className="mt-2 text-[11px] text-[#52525b] underline">Dismiss</button>
            </div>
          )}

          {/* Live preview */}
          {ticketData.category && (
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider">Live Preview</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#52525b]">Category</span>
                <span className="text-[12px] text-[#e4e4e7] font-medium">{ticketData.category}</span>
              </div>
              {ticketData.subType && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#52525b]">Sub-type</span>
                  <span className="text-[11.5px] text-[#a1a1aa]">{ticketData.subType}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#52525b]">Priority</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${PRIORITY_BG[ticketData.priority]}`}>
                  {ticketData.priority}
                </span>
              </div>
              {ticketData.ticketId && (
                <div className="flex items-center justify-between pt-1 border-t border-[#27272a]">
                  <span className="text-[11px] text-[#52525b]">Ticket ID</span>
                  <span className="text-[12px] font-mono text-[#22c55e]">{ticketData.ticketId}</span>
                </div>
              )}
            </div>
          )}

          {/* Talk to agent */}
          <div className="bg-[#3b82f6]/8 border border-[#3b82f6]/20 rounded-xl p-4">
            <p className="text-[12px] font-semibold text-[#3b82f6] mb-1.5">Need human support?</p>
            <p className="text-[11px] text-[#71717a] mb-3">Skip the AI and reach a support agent directly.</p>
            <button
              onClick={onEscalate}
              className="w-full py-2.5 rounded-lg bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#3b82f6] text-[13px] font-semibold hover:bg-[#3b82f6]/25 active:scale-[0.98] transition-all"
            >
              Talk to a Support Agent
            </button>
          </div>
        </div>
        {/* Safe area spacer for phones */}
        <div className="h-safe-bottom pb-4" />
      </div>
    </>
  );
};

// ── Welcome screen (shown when chat is empty — ChatGPT–style) ────────────────
const WelcomeScreen = ({ firstName, onSelect, onCheckStatus, onEscalate }) => (
  <div className="flex flex-col items-center justify-center py-10 px-4">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center mb-5 shadow-2xl shadow-[#3b82f6]/25">
      <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
      </svg>
    </div>
    <h2 className="text-[26px] sm:text-[30px] font-semibold text-[#fafafa] mb-2 text-center leading-tight">
      {firstName ? `How can I help, ${firstName}?` : 'How can I help you today?'}
    </h2>
    <p className="text-[#71717a] text-[13px] mb-8 text-center max-w-xs">
      Describe your IT issue or pick a suggestion below to get started
    </p>
    <div className="grid grid-cols-2 gap-2.5 w-full max-w-lg mb-5">
      {[
        { icon: '💻', title: 'Hardware issue',     sub: 'Laptop, monitor, keyboard…',   query: 'I have a hardware problem with my laptop or computer' },
        { icon: '🔑', title: 'Password / Access',  sub: 'Reset, lockout, MFA…',          query: 'I need to reset my password or fix an account access issue' },
        { icon: '🌐', title: 'Network / VPN',       sub: 'WiFi, internet, VPN…',          query: 'I have a network or VPN connectivity issue' },
        { icon: '📧', title: 'Email & Teams',       sub: 'Outlook, calendar, collab…',    query: 'I have an issue with Outlook, Teams or email' },
      ].map(s => (
        <button
          key={s.title}
          onClick={() => onSelect(s.query)}
          className="flex items-start gap-3 p-4 rounded-xl bg-[#1c1c1f] hover:bg-[#27272a] border border-[#27272a] hover:border-[#3f3f46] text-left transition-all active:scale-[0.98]"
        >
          <span className="text-xl leading-none mt-0.5 flex-shrink-0">{s.icon}</span>
          <div>
            <p className="text-[13px] font-medium text-[#e4e4e7] leading-tight">{s.title}</p>
            <p className="text-[11px] text-[#52525b] mt-0.5">{s.sub}</p>
          </div>
        </button>
      ))}
    </div>
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={onCheckStatus}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] text-[#3b82f6] border border-[#3b82f6]/30 bg-[#3b82f6]/5 hover:bg-[#3b82f6]/15 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        Check ticket status
      </button>
      <button
        onClick={onEscalate}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] text-[#71717a] border border-[#27272a] hover:bg-[#1c1c1f] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Talk to an agent
      </button>
    </div>
  </div>
);

// ── Main Chatbot component ────────────────────────────────────────────────────
const Chatbot = () => {
  const navigate = useNavigate();

  const _firstName = (() => { const n = localStorage.getItem('userName'); return n ? n.trim().split(/\s+/)[0] : ''; })();

  const _initMsg = [{
    sender: 'bot',
    message: `👋 Hi${_firstName ? ` ${_firstName}` : ''}! I'm HiTicket AI.\n\nDescribe your IT issue and I'll classify it automatically — or browse the categories below.\n\nYou can also:\n• Type a ticket ID (e.g. TKT-0012) to check its status\n• Type "check status" to see your recent tickets\n• Type "talk to agent" to reach a human agent`,
    timestamp: ts(),
    msgTime: now(),
  }];

  const _s = loadSession();
  const [messages,     setMessages]     = useState(_s?.messages     || _initMsg);
  const [flowStep,     setFlowStep]     = useState(_s?.flowStep      || 1);
  const [chipType,     setChipType]     = useState(_s?.chipType      ?? 'category');
  const [quickReplies, setQuickReplies] = useState(_s?.quickReplies  || []);
  const [ticketData,   setTicketData]   = useState(_s?.ticketData    || { category: '', subType: '', description: '', details: '', priority: 'Medium', ticketId: '' });
  const [submitted,    setSubmitted]    = useState(_s?.submitted     || false);
  const [lastTicketId, setLastTicketId] = useState(_s?.lastTicketId  || null);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [intentBadge, setIntentBadge] = useState(null);   // { label, color }
  const [commentMode, setCommentMode] = useState(null);   // { ticketId, mongoId }
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [similarTickets, setSimilarTickets] = useState([]);
  const [dupeChecking, setDupeChecking] = useState(false);
  const dupeTimerRef = useRef(null);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [msgFeedback,    setMsgFeedback]    = useState({});
  const [kbSuggestions,  setKbSuggestions]  = useState([]);
  const [statusNavId,    setStatusNavId]    = useState(null);
  const [statusTickets,  setStatusTickets]  = useState([]);

  // ── ChatGPT-style layout ───────────────────────────────────────────────────
  const [sessionId]                        = useState(() => _s?.sessionId || `sess_${Date.now()}`);
  const [sidebarOpen,  setSidebarOpen]     = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [chatHistory,  setChatHistory]     = useState(getHistory);
  const [activeSessionId]                  = useState(() => _s?.sessionId || null);

  // Persist chat state across page refreshes within same browser tab
  useEffect(() => {
    saveSession({ sessionId, messages, flowStep, chipType, quickReplies, ticketData, submitted, lastTicketId });
  }, [sessionId, messages, flowStep, chipType, quickReplies, ticketData, submitted, lastTicketId]);

  // Proactive ticket update notification (polls every 90 s after ticket submitted)
  useEffect(() => {
    if (!lastTicketId) return;
    const poll = setInterval(() => {
      api.get(`/tickets?q=${encodeURIComponent(lastTicketId)}&limit=5`)
        .then(({ data }) => {
          const t = (data.tickets || []).find(t => t.ticketId === lastTicketId);
          if (!t) return;
          const prevRaw = sessionStorage.getItem('hd_last_status');
          const prev = prevRaw ? JSON.parse(prevRaw) : null;
          if (prev && prev.status !== t.status) {
            const meta = STATUS_META[t.status] || STATUS_META['Open'];
            const assignPart = t.assignedTo && t.assignedTo !== 'Unassigned' ? ` · Assigned to **${t.assignedTo}**` : '';
            setMessages(m => [...m, {
              sender: 'bot',
              message: `${meta.dot} Update on **${t.ticketId}**: status changed to **${t.status}**${assignPart}.`,
              timestamp: ts(), msgTime: now(),
            }]);
          }
          sessionStorage.setItem('hd_last_status', JSON.stringify({ status: t.status }));
        })
        .catch(() => {});
    }, 90000);
    return () => clearInterval(poll);
  }, [lastTicketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const botReply = (message, delay = 950, afterCb = null) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { sender: 'bot', message, timestamp: ts(), msgTime: now() }]);
      if (afterCb) afterCb();
    }, delay);
  };

  const userSend = (text) => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    setMessages((prev) => [...prev, { sender: 'user', message: trimmed, timestamp: ts(), msgTime: now() }]);
    setInput('');
    setIntentBadge(null);
    setChipType(null);
    setQuickReplies([]);
    processInput(trimmed);
  };

  const handleSend = () => userSend(input);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const _buildHistoryEntry = () => {
    const userMsgs = messages.filter(m => m.sender === 'user');
    if (userMsgs.length === 0) return null;
    const rawTitle = userMsgs[0].message;
    const title = rawTitle.length > 54 ? rawTitle.slice(0, 54) + '…' : rawTitle;
    return { id: sessionId, title, date: new Date().toISOString(), messages, flowStep, ticketData, submitted, lastTicketId };
  };

  const handleNewChat = () => {
    const entry = _buildHistoryEntry();
    if (entry) saveToHistory(entry);
    clearSession();
    window.location.reload();
  };

  const loadHistorySession = (session) => {
    const entry = _buildHistoryEntry();
    if (entry) saveToHistory(entry);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      sessionId: session.id,
      messages: session.messages,
      flowStep: session.flowStep || 5,
      chipType: null,
      quickReplies: [],
      ticketData: session.ticketData || { category: '', subType: '', description: '', details: '', priority: 'Medium', ticketId: '' },
      submitted: session.submitted || (session.flowStep >= 5),
      lastTicketId: session.lastTicketId || null,
    }));
    setSidebarOpen(false);
    window.location.reload();
  };

  const processInput = (text) => {
    // KB prompt — did the KB article solve it?
    if (chipType === 'kbprompt') { handleKbPrompt(text); return; }

    // Comment mode — user is typing a comment for an existing ticket
    if (commentMode) {
      const { ticketId, mongoId } = commentMode;
      setCommentMode(null);
      api.post(`/tickets/${mongoId}/comments`, { text })
        .then(() => {
          botReply(`Comment added to **${ticketId}** ✓\n\nThe support team will be notified.`, 700, () => {
            setChipType('tickets');
            setQuickReplies(['Check Status Again', 'Raise New Ticket']);
          });
        })
        .catch(() => botReply('Failed to add comment. Please try again.', 600));
      return;
    }

    // Priority override — works while in the ticket flow
    if (ticketData.category && /\b(change priority|set priority|priority to|it.?s critical|it.?s urgent|mark (?:as )?critical|mark (?:as )?high|mark (?:as )?medium|mark (?:as )?low)\b/i.test(text)) {
      let np = ticketData.priority;
      if (/critical/i.test(text)) np = 'Critical';
      else if (/high/i.test(text)) np = 'High';
      else if (/medium/i.test(text)) np = 'Medium';
      else if (/low/i.test(text)) np = 'Low';
      setTicketData(prev => ({ ...prev, priority: np }));
      botReply(`Priority updated to **${np}**. Anything else to adjust?`, 600, () => {
        if (flowStep >= 4) {
          setChipType('confirm');
          setQuickReplies(['Confirm & Submit', 'Edit Details', 'Cancel']);
        }
      });
      return;
    }

    // Global intents — handled regardless of current step
    if (/\b(human|agent|person|real person|speak to|talk to|escalate|representative|support staff)\b/i.test(text)) {
      handleEscalation(); return;
    }
    // Ticket ID or status-check intent — always available
    if (/TKT-\d+/i.test(text) || /\b(status|check status|my tickets|track ticket|ticket update|check again)\b/i.test(text)) {
      handleStatusLookup(text); return;
    }
    if (flowStep === 1) handleStep1(text);
    else if (flowStep === 2) handleStep2(text);
    else if (flowStep === 3) handleStep3(text);
    else if (flowStep === 4) handleStep4(text);
    else handleDone(text);
  };

  // STEP 1: initial description or category selection from grid
  const handleStep1 = (text) => {
    const pickedCat = CATEGORY_NAMES.find(
      (n) => n.toLowerCase() === text.toLowerCase()
    );
    const detected = pickedCat || detectCategory(text);

    if (detected) {
      const priority = detectPriority(text, detected, null);
      setTicketData((prev) => ({ ...prev, category: detected, priority, description: text }));
      setFlowStep(2);

      // Background duplicate check (only for free-text, not category picks)
      if (!pickedCat && text.length > 15) {
        setDupeChecking(true);
        clearTimeout(dupeTimerRef.current);
        dupeTimerRef.current = setTimeout(() => {
          const words = text.split(/\s+/).filter(w => w.length > 4).slice(0, 6).join(' ');
          api.get(`/tickets?q=${encodeURIComponent(words)}`)
            .then(({ data }) => {
              const similar = (data.tickets || []).filter(t => ['Open', 'In Progress'].includes(t.status));
              setSimilarTickets(similar.slice(0, 3));
            })
            .catch(() => {})
            .finally(() => setDupeChecking(false));
        }, 600);
      }

      // Fetch related KB articles and offer them in-chat first
      setKbSuggestions([]);
      api.get(`/kb?q=${encodeURIComponent(detected)}`)
        .then(({ data }) => {
          const arts = (data.articles || []).slice(0, 3);
          setKbSuggestions(arts);
          if (arts.length > 0) {
            const titles = arts.map(a => `• ${a.title}`).join('\n');
            botReply(
              `Got it — I've identified this as a **${detected}** issue.\n\n💡 Before we continue, here are some articles that might solve your issue:\n\n${titles}`,
              900, () => {
                setChipType('kbprompt');
                setQuickReplies(['✅ This solved my issue', '❌ Still need to raise a ticket']);
              }
            );
          } else {
            const cfg = CATEGORIES[detected];
            botReply(`Got it — I've identified this as a **${detected}** issue.\n\n${cfg.subTypeQuestion}`, 1000, () => {
              setChipType('subtype'); setQuickReplies(cfg.subTypes);
            });
          }
        })
        .catch(() => {
          const cfg = CATEGORIES[detected];
          botReply(`Got it — I've identified this as a **${detected}** issue.\n\n${cfg.subTypeQuestion}`, 1000, () => {
            setChipType('subtype'); setQuickReplies(cfg.subTypes);
          });
        });
    } else {
      botReply(
        "I couldn't automatically classify that. Please pick a category below or try rephrasing with the device or app name:",
        800,
        () => setChipType('category')
      );
    }
  };

  // Handle KB prompt decision (did the article solve it?)
  const handleKbPrompt = (text) => {
    if (/solved|yes|fixed|worked|thanks|great/i.test(text)) {
      botReply("Great! Glad the article helped. 🎉\n\nFeel free to come back if you need anything else.", 700, () => {
        setFlowStep(1);
        setChipType('category');
        setTicketData({ category: '', subType: '', description: '', details: '', priority: 'Medium', ticketId: '' });
      });
    } else {
      const cfg = CATEGORIES[ticketData.category];
      if (!cfg) { setChipType('category'); return; }
      botReply(`No problem! Let's continue raising a ticket.\n\n${cfg.subTypeQuestion}`, 700, () => {
        setChipType('subtype'); setQuickReplies(cfg.subTypes);
      });
    }
  };

  // STEP 2: sub-type selection
  const handleStep2 = (text) => {
    const cat = ticketData.category;
    const cfg = CATEGORIES[cat];
    const matched =
      cfg.subTypes.find((s) => s.toLowerCase() === text.toLowerCase()) ||
      cfg.subTypes.find((s) => text.toLowerCase().includes(s.toLowerCase().split(' ')[0].toLowerCase())) ||
      text;

    const priority = detectPriority(
      ticketData.description + ' ' + text,
      cat,
      matched
    );
    setTicketData((prev) => ({ ...prev, subType: matched, priority }));
    setFlowStep(3);

    const detailQ = cfg.detailQuestions[matched] || cfg.detailQuestions[Object.keys(cfg.detailQuestions)[0]];
    botReply(detailQ, 1000, () => {
      setChipType('detail');
      setQuickReplies(cfg.detailChips || []);
    });
  };

  // STEP 3: additional detail capture
  const handleStep3 = (text) => {
    const allText = ticketData.description + ' ' + ticketData.subType + ' ' + text;
    const priority = detectPriority(allText, ticketData.category, ticketData.subType);
    setTicketData((prev) => ({ ...prev, details: text, priority }));
    setFlowStep(4);

    const descPreview =
      ticketData.description.length > 90
        ? ticketData.description.substring(0, 90) + '…'
        : ticketData.description;

    botReply(
      `Thanks for the details! Here's your ticket summary:\n\nCategory: ${ticketData.category}\nSub-type: ${ticketData.subType || 'General'}\nPriority: **${priority}**\nIssue: ${descPreview}\n\nShall I go ahead and submit this ticket?\n\n_Say "change priority to Critical/High/Low" to adjust before submitting._`,
      1100,
      () => {
        setChipType('confirm');
        setQuickReplies(['Confirm & Submit', 'Change Priority to Critical', 'Change Priority to High', 'Edit Details', 'Cancel']);
      }
    );
  };

  // STEP 4: confirm / edit / cancel
  const handleStep4 = (text) => {
    const t = text.toLowerCase();
    const isConfirm =
      t.includes('yes') ||
      t.includes('submit') ||
      t.includes('confirm') ||
      t.includes('go ahead');
    const isEdit =
      t.includes('edit') || t.includes('change') || t.includes('update');

    if (isConfirm) {
      const eta =
        ticketData.priority === 'Critical'
          ? '1 hour'
          : ticketData.priority === 'High'
          ? '4 business hours'
          : '1 business day';
      setFlowStep(5);
      setSubmitted(true);
      // Submit to real backend
      api.post('/tickets', {
        title: ticketData.description.length > 80
          ? ticketData.description.substring(0, 80) + '…'
          : ticketData.description,
        description: ticketData.description + (ticketData.details ? '\n\nAdditional details: ' + ticketData.details : ''),
        category: ticketData.category,
        subType: ticketData.subType || '',
        priority: ticketData.priority,
      }).then(({ data }) => {
        const id = data.ticket.ticketId || data.ticket._id;
        setTicketData((prev) => ({ ...prev, ticketId: id }));
        setLastTicketId(id); // enables proactive status polling
        sessionStorage.removeItem('hd_last_status'); // reset baseline for polling
        logActivity('TICKET_CREATED', {
          category: 'TICKET', severity: 'info',
          detail: `Ticket ${id} created via AI chatbot`,
          metadata: {
            ticketId: id,
            category: ticketData.category,
            subType: ticketData.subType || 'General',
            priority: ticketData.priority,
            titlePreview: (data.ticket.title || '').slice(0, 80),
          },
        });
        botReply(
          `Ticket **${id}** submitted! ✓\n\n${ticketData.category} — ${ticketData.subType || 'General'}\nPriority: ${ticketData.priority}\n\nExpected response within ${eta}.\n\nI'll notify you here if the status changes. Type the ticket ID anytime to check it.`,
          1300,
          () => {
            setChipType('done');
            setQuickReplies(['View My Tickets', 'Raise Another Ticket']);
          }
        );
      }).catch(() => {
        botReply('Failed to submit ticket. Please check your connection and try again.', 800, () => {
          setFlowStep(4);
          setSubmitted(false);
          setQuickReplies(['Confirm & Submit', 'Edit Details', 'Cancel']);
        });
      });
    } else if (isEdit) {
      setFlowStep(1);
      setTicketData({ category: '', subType: '', description: '', details: '', priority: 'Medium', ticketId: '' });
      botReply("No problem! Let's start over. Describe your issue or pick a category:", 800, () =>
        setChipType('category')
      );
    } else {
      setFlowStep(1);
      setTicketData({ category: '', subType: '', description: '', details: '', priority: 'Medium', ticketId: '' });
      botReply("Cancelled. Feel free to raise a new ticket whenever you're ready!", 800, () =>
        setChipType('category')
      );
    }
  };

  // ── Status lookup — triggered globally for TKT-XXXX or status intents ───────────────
  const handleStatusLookup = (rawText) => {
    const tktId = rawText.match(/TKT-\d+/i)?.[0]?.toUpperCase();
    setStatusTickets([]);
    botReply('Looking that up…', 350, null);

    if (tktId) {
      api.get(`/tickets?q=${encodeURIComponent(tktId)}&limit=10`)
        .then(({ data }) => {
          const found = (data.tickets || []).find(
            t => t.ticketId?.toUpperCase() === tktId
          );
          if (found) {
            setStatusNavId(found._id);
            setLastTicketId(found.ticketId);
            const meta = STATUS_META[found.status] || STATUS_META['Open'];
            const updated = new Date(found.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const assignedLine = found.assignedTo && found.assignedTo !== 'Unassigned'
              ? `\nAssigned to: ${found.assignedTo}` : '';
            const isResolved = ['Resolved', 'Closed'].includes(found.status);
            botReply(
              `${meta.dot} **${found.ticketId}** — ${found.title}\n\nStatus: **${found.status}**  ·  Priority: **${found.priority}**\nCategory: ${found.category}${assignedLine}\nLast updated: ${updated}`,
              700, () => {
                setChipType('tickets');
                const chips = isResolved
                  ? ['Reopen This Ticket', 'Raise New Ticket']
                  : ['Add a Comment', 'Raise New Ticket'];
                setQuickReplies(chips);
              }
            );
          } else {
            // Fallback: public endpoint
            api.get(`/tickets/public/${tktId}`)
              .then(({ data: pd }) => {
                const p = pd.ticket;
                const meta = STATUS_META[p.status] || STATUS_META['Open'];
                const updated = new Date(p.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                botReply(
                  `${meta.dot} **${p.ticketId}** — ${p.title}\n\nStatus: **${p.status}**  ·  Priority: **${p.priority}**\nCategory: ${p.category}\nLast updated: ${updated}`,
                  700, () => {
                    setChipType('tickets');
                    setQuickReplies(['Raise New Ticket']);
                  }
                );
              })
              .catch(() => {
                botReply(`I couldn't find **${tktId}**. Make sure the ID is correct (e.g. TKT-0012).`, 700, () => {
                  setChipType('tickets');
                  setQuickReplies(['Raise New Ticket']);
                });
              });
          }
        })
        .catch(() => botReply("Couldn't retrieve tickets right now. Please try again.", 700));
    } else {
      // No ticket ID — fetch recent tickets and show as ID chips for quick selection
      api.get('/tickets?limit=8')
        .then(({ data }) => {
          const all = data.tickets || [];
          if (all.length === 0) {
            botReply("You don't have any open tickets yet. Shall I help you raise one?", 700, () => setChipType('category'));
          } else {
            setStatusTickets(all.slice(0, 8));
            botReply(
              `Here are your recent tickets — tap an ID below to check its status:`,
              600, () => {
                setChipType('tickets');
                setQuickReplies(['Raise New Ticket']);
              }
            );
          }
        })
        .catch(() => {
          botReply("Couldn't retrieve tickets right now.", 700, () => {
            setChipType(null); setQuickReplies([]);
          });
        });
    }
  };

  // ── Escalation to human agent ─────────────────────────────────────────────
  const handleEscalation = () => {
    botReply(
      "I'll connect you with a support agent.\n\n📞 IT Helpdesk\nextension 1234  (Mon–Fri 8 am–6 pm)\n\n📧 Email\nhelpdesk@company.com\n\n🎫 Or raise a ticket marked High priority — an agent will respond within 4 business hours.",
      900, () => { setChipType('category'); }
    );
  };

  // STEP 5: post-submit or post-status navigation
  const handleDone = (text) => {
    const t = text.toLowerCase();
    if (t.includes('view all') || t.includes('my tickets') || t.includes('all tickets')) {
      navigate('/my-tickets');
    } else if (t.includes('check again') || t.includes('check status') || t.includes('check another') || t.includes('another ticket')) {
      handleStatusLookup('check status');
    } else if (t.includes('reopen')) {
      if (!statusNavId) { botReply("I don't have a ticket to reopen. Look up a ticket ID first.", 600); return; }
      api.patch(`/tickets/${statusNavId}`, { status: 'Open' })
        .then(({ data }) => {
          const id = data.ticket?.ticketId || lastTicketId || 'the ticket';
          botReply(`🔵 **${id}** has been reopened and is now **Open**.\n\nThe support team will be notified.`, 700, () => {
            setChipType('tickets');
            setQuickReplies(['Check Status Again', 'Raise New Ticket']);
          });
        })
        .catch(() => botReply('Failed to reopen the ticket. You may not have permission.', 600));
    } else if (t.includes('add a comment') || t.includes('add comment') || t.includes('comment')) {
      if (!statusNavId) { botReply('Look up a ticket ID first so I know which ticket to comment on.', 600); return; }
      const label = lastTicketId || 'the ticket';
      setCommentMode({ ticketId: label, mongoId: statusNavId });
      botReply(`Type your comment below and I'll add it to **${label}**:`, 500, () => {
        setChipType(null); setQuickReplies([]);
      });
    } else if (t.includes('another') || t.includes('new') || t.includes('raise')) {
      clearSession();
      window.location.reload();
    } else {
      botReply("You can view your tickets in 'My Tickets' or raise a new one anytime.", 800, () => {
        setChipType('done');
        setQuickReplies(['View All Tickets', 'Raise Another Ticket']);
      });
    }
  };

  const inputPlaceholder =
    commentMode        ? `Type your comment for ${commentMode.ticketId}…`
    : flowStep === 1   ? 'Describe your issue, or type a ticket ID to check status…'
    : flowStep === 2   ? 'Select a sub-type above or type it…'
    : flowStep === 3   ? 'Provide more details about the issue…'
    : flowStep === 4   ? 'Type "yes" to confirm, "edit" to change, or "cancel"…'
    : 'What would you like to do next?';

  // Intent detection badge while typing
  useEffect(() => {
    if (!input || input.length < 6 || flowStep !== 1) { setIntentBadge(null); return; }
    const detected = detectCategory(input);
    if (detected) {
      setIntentBadge({ label: detected, color: CATEGORIES[detected].color });
    } else {
      setIntentBadge(null);
    }
  }, [input, flowStep]);

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100dvh - 64px)' }}>

      {/* ── Left sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Left sidebar ── */}
      <aside
        className="fixed top-[64px] left-0 bottom-0 z-30 lg:relative lg:top-auto lg:bottom-auto lg:z-auto flex-shrink-0 bg-[#111113] border-r border-[#27272a] flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarOpen ? '260px' : '0px' }}
      >
        <div className="flex flex-col h-full" style={{ minWidth: '260px' }}>
          {/* Logo + new-chat icon */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2 flex-shrink-0">
            <div className="flex-1 flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-[#e4e4e7]">HiTicket AI</span>
            </div>
            <button
              onClick={handleNewChat}
              title="New chat"
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[#71717a] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>

          {/* Chat history list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {chatHistory.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-[11px] text-[#3f3f46]">No chat history yet.</p>
                <p className="text-[10px] text-[#3f3f46] mt-1">Start a conversation to see it here.</p>
              </div>
            ) : (
              (() => {
                const today = new Date().toDateString();
                const yesterday = new Date(Date.now() - 86400000).toDateString();
                const groups = {};
                chatHistory.forEach(s => {
                  const d = new Date(s.date).toDateString();
                  const label = d === today ? 'Today' : d === yesterday ? 'Yesterday'
                    : new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                  if (!groups[label]) groups[label] = [];
                  groups[label].push(s);
                });
                return Object.entries(groups).map(([label, sessions]) => (
                  <div key={label} className="mb-3">
                    <p className="text-[10px] font-semibold text-[#3f3f46] uppercase tracking-wider px-2.5 py-1.5">{label}</p>
                    {sessions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => loadHistorySession(s)}
                        className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
                          s.id === activeSessionId
                            ? 'bg-[#27272a] text-[#fafafa]'
                            : 'text-[#71717a] hover:bg-[#1c1c1f] hover:text-[#d4d4d8]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 text-[#3f3f46] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <span className="truncate flex-1 text-[12px]">{s.title}</span>
                      </button>
                    ))}
                  </div>
                ));
              })()
            )}
          </div>

          {/* Bottom quick-links */}
          <div className="border-t border-[#27272a] px-2 py-2 space-y-0.5 flex-shrink-0">
            <button onClick={() => navigate('/my-tickets')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#1c1c1f] transition-colors text-left">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              My Tickets
            </button>
            <button onClick={() => navigate('/knowledge-base')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#1c1c1f] transition-colors text-left">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Knowledge Base
            </button>
            <button onClick={handleEscalation}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#1c1c1f] transition-colors text-left">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Talk to Agent
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0b]">

        {/* Top bar */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 border-b border-[#27272a] bg-[#111113] shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[#71717a] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors flex-shrink-0"
              title={sidebarOpen ? 'Close sidebar' : 'History'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
                  </svg>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#22c55e] rounded-full border border-[#111113]" />
              </div>
              <div>
                <span className="text-[13.5px] font-semibold text-[#fafafa]">HiTicket AI</span>
                <span className="text-[10px] text-[#22c55e] ml-2 hidden sm:inline">● Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {flowStep > 1 && flowStep < 5 && (
              <div className="hidden sm:flex items-center mr-2" style={{ maxWidth: '200px' }}>
                <StepProgress currentStep={flowStep} compact />
              </div>
            )}
            <button
              onClick={() => {
                const txt = messages.map(m =>
                  `[${m.timestamp || ''}] ${m.sender === 'bot' ? 'HiTicket AI' : 'You'}: ${m.message}`
                ).join('\n\n');
                const blob = new Blob([txt], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`;
                a.click(); URL.revokeObjectURL(a.href);
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[#71717a] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors"
              title="Download transcript"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] border border-[#27272a] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="hidden sm:inline">New chat</span>
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length <= 1 && !isTyping ? (
              <>
                <WelcomeScreen
                  firstName={_firstName}
                  onSelect={userSend}
                  onCheckStatus={() => userSend('check status')}
                  onEscalate={handleEscalation}
                />
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <ChatBubble {...msg} />
                    {msg.sender === 'bot' && i > 0 && (
                      <div className="flex items-center gap-0.5 ml-11 mt-0.5">
                        <button
                          title="Helpful"
                          onClick={() => setMsgFeedback(p => ({ ...p, [i]: p[i] === 'up' ? null : 'up' }))}
                          className={`p-1 rounded transition-colors ${msgFeedback[i] === 'up' ? 'text-[#22c55e]' : 'text-[#3f3f46] hover:text-[#71717a]'}`}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                        </button>
                        <button
                          title="Not helpful"
                          onClick={() => setMsgFeedback(p => ({ ...p, [i]: p[i] === 'down' ? null : 'down' }))}
                          className={`p-1 rounded transition-colors ${msgFeedback[i] === 'down' ? 'text-[#ef4444]' : 'text-[#3f3f46] hover:text-[#71717a]'}`}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.641a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                          </svg>
                        </button>
                        {msgFeedback[i] && <span className="text-[9px] text-[#52525b] ml-0.5">Thanks!</span>}
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom input area ── */}
        <div className="px-3 sm:px-4 pt-2 shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="max-w-3xl mx-auto">

            {/* Category grid */}
            {chipType === 'category' && (
              <div className="mb-2 border border-[#27272a] rounded-2xl overflow-hidden bg-[#0f0f11]">
                <div className="px-4 pt-2.5 pb-1">
                  <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider">Choose a category</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 px-3 pb-3">
                  {CATEGORY_NAMES.map((name) => {
                    const cfg = CATEGORIES[name];
                    const Icon = CATEGORY_ICONS[name];
                    return (
                      <button key={name} onClick={() => userSend(name)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1c1c1f] hover:bg-[#27272a] active:scale-[0.97] transition-all text-left border"
                        style={{ borderColor: `${cfg.color}20`, borderLeftWidth: 3, borderLeftColor: cfg.color }}>
                        {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />}
                        <span className="text-[11.5px] font-medium text-[#d4d4d8] leading-tight">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ticket ID chips */}
            {chipType === 'tickets' && statusTickets.length > 0 && (
              <div className="mb-2 p-3 border border-[#27272a] rounded-2xl bg-[#0f0f11]">
                <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider mb-2">Your tickets — tap to check status</p>
                <div className="flex flex-wrap gap-1.5">
                  {statusTickets.map((t) => {
                    const meta = STATUS_META[t.status] || STATUS_META['Open'];
                    return (
                      <button key={t._id} onClick={() => userSend(t.ticketId)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left active:scale-95 transition-all"
                        style={{ borderColor: `${meta.color}40`, background: `${meta.color}08` }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                        <span className="text-[12px] font-mono font-semibold" style={{ color: meta.color }}>{t.ticketId}</span>
                        <span className="text-[10px] text-[#71717a] hidden sm:inline truncate max-w-[120px]">
                          {t.title?.slice(0, 28)}{(t.title?.length ?? 0) > 28 ? '…' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick replies */}
            {chipType && chipType !== 'category' && quickReplies.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {quickReplies.map((q) => (
                  <QuickReply key={q} label={q} onClick={userSend}
                    variant={q.includes('❌') || q.toLowerCase().includes('cancel') ? 'warning' : q.includes('✅') || q.toLowerCase().includes('submit') ? 'success' : 'default'}
                  />
                ))}
              </div>
            )}

            {/* Duplicate ticket warning */}
            {similarTickets.length > 0 && flowStep >= 2 && !submitted && (
              <div className="mb-2 px-3 py-2 rounded-xl bg-[#f59e0b]/6 border border-[#f59e0b]/25 flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[#f59e0b] mb-0.5">You may already have an open ticket for this:</p>
                  <div className="flex flex-wrap gap-1">
                    {similarTickets.map(t => (
                      <a key={t._id} href={`/tickets/${t._id}`}
                        className="text-[10px] font-mono text-[#3b82f6] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded">{t.ticketId}</a>
                    ))}
                  </div>
                </div>
                <button onClick={() => setSimilarTickets([])} className="text-[#52525b] hover:text-[#a1a1aa] flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            )}

            {/* Intent detection badge */}
            {intentBadge && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] text-[#52525b]">Detected:</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{ color: intentBadge.color, borderColor: `${intentBadge.color}40`, background: `${intentBadge.color}10` }}>
                  {intentBadge.label}
                </span>
                <span className="text-[10px] text-[#52525b]">— confirm or describe more</span>
              </div>
            )}

            {/* Comment mode indicator */}
            {commentMode && (
              <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg bg-[#3b82f6]/8 border border-[#3b82f6]/20">
                <svg className="w-3 h-3 text-[#3b82f6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-[11px] text-[#3b82f6] flex-1">Commenting on <strong>{commentMode.ticketId}</strong></span>
                <button onClick={() => setCommentMode(null)} className="text-[10px] text-[#52525b] hover:text-[#fafafa] transition-colors">Cancel</button>
              </div>
            )}

            {/* The input box */}
            <div className="relative bg-[#1c1c1f] border border-[#27272a] rounded-2xl focus-within:border-[#3b82f6]/50 transition-colors shadow-lg">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder={inputPlaceholder}
                className="w-full bg-transparent text-[14px] text-[#fafafa] placeholder-[#3f3f46] resize-none outline-none leading-relaxed px-4 pt-3.5 pb-12"
                style={{ minHeight: '52px', maxHeight: '120px' }}
                disabled={submitted && chipType === null}
              />
              {/* Bottom row inside input box */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 pb-2.5 pointer-events-none">
                <div className="pointer-events-auto">
                  {input.length > 80 && (
                    <span className={`text-[10px] ${input.length > 450 ? 'text-[#ef4444]' : 'text-[#52525b]'}`}>
                      {input.length}/500
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 pointer-events-auto">
                  {input.length > 0 && (
                    <button
                      onClick={() => { setInput(''); if (inputRef.current) { inputRef.current.style.height = '52px'; inputRef.current.focus(); } }}
                      className="w-7 h-7 rounded-full bg-[#27272a] hover:bg-[#3f3f46] flex items-center justify-center text-[#71717a] hover:text-[#fafafa] transition-colors"
                      aria-label="Clear input"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-8 h-8 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-center text-[#3f3f46] mt-2">
              <kbd className="px-1 py-0.5 rounded bg-[#1c1c1f] text-[#52525b] text-[9px]">Enter</kbd>
              {' '}to send ·{' '}
              <kbd className="px-1 py-0.5 rounded bg-[#1c1c1f] text-[#52525b] text-[9px]">Shift+Enter</kbd>
              {' '}for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
