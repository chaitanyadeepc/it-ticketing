import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import ChatBubble, { TypingIndicator } from '../components/ChatBubble';
import api from '../api/api';
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
const StepProgress = ({ currentStep }) => {
  const steps = [
    { id: 1, label: 'Describe' },
    { id: 2, label: 'Sub-type' },
    { id: 3, label: 'Details' },
    { id: 4, label: 'Confirm' },
    { id: 5, label: 'Done' },
  ];
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
    className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all duration-150 whitespace-nowrap ${
      variant === 'warning'
        ? 'border-[#ef4444]/40 text-[#ef4444] bg-[#ef4444]/5 hover:bg-[#ef4444]/15'
        : variant === 'success'
        ? 'border-[#22c55e]/40 text-[#22c55e] bg-[#22c55e]/5 hover:bg-[#22c55e]/15'
        : 'border-[#3b82f6]/40 text-[#3b82f6] bg-[#3b82f6]/5 hover:bg-[#3b82f6]/15 hover:border-[#3b82f6]'
    }`}
  >
    {label}
  </button>
);

// ── Category grid shown at step 1 ─────────────────────────────────────────────
const CategoryGrid = ({ onSelect }) => (
  <div className="grid grid-cols-2 gap-1.5 px-4 pb-3 pt-3 border-t border-[#27272a]">
    {CATEGORY_NAMES.map((name) => {
      const cfg = CATEGORIES[name];
      const Icon = CATEGORY_ICONS[name];
      return (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#27272a] bg-[#1c1c1f] hover:border-[#3b82f6]/40 hover:bg-[#27272a] transition-all text-left"
        >
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />}
          <span className="text-[11.5px] font-medium text-[#e4e4e7] leading-tight">{name}</span>
        </button>
      );
    })}
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

// ── Main Chatbot component ────────────────────────────────────────────────────
const Chatbot = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      message:
        "👋 Hi! I'm TicketFlow AI.\n\nDescribe your IT issue and I'll classify it automatically — or browse the categories below to find your issue faster.",
      timestamp: ts(),
    },
  ]);
  const [input, setInput] = useState('');
  const [flowStep, setFlowStep] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  // chipType: 'category' | 'subtype' | 'detail' | 'confirm' | 'done' | null
  const [chipType, setChipType] = useState('category');
  const [quickReplies, setQuickReplies] = useState([]);
  const [ticketData, setTicketData] = useState({
    category: '',
    subType: '',
    description: '',
    details: '',
    priority: 'Medium',
    ticketId: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [similarTickets, setSimilarTickets] = useState([]);
  const [dupeChecking, setDupeChecking] = useState(false);
  const dupeTimerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const botReply = (message, delay = 950, afterCb = null) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { sender: 'bot', message, timestamp: ts() }]);
      if (afterCb) afterCb();
    }, delay);
  };

  const userSend = (text) => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    setMessages((prev) => [...prev, { sender: 'user', message: trimmed, timestamp: ts() }]);
    setInput('');
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

  const processInput = (text) => {
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

      const cfg = CATEGORIES[detected];
      botReply(
        `Got it — I've identified this as a **${detected}** issue.\n\n${cfg.subTypeQuestion}`,
        1000,
        () => {
          setChipType('subtype');
          setQuickReplies(cfg.subTypes);
        }
      );
    } else {
      botReply(
        "I couldn't automatically classify that. Please pick a category below or try rephrasing with the device or app name:",
        800,
        () => setChipType('category')
      );
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
      `Thanks for the details! Here's your ticket summary:\n\nCategory: ${ticketData.category}\nSub-type: ${ticketData.subType || 'General'}\nPriority: ${priority}\nIssue: ${descPreview}\n\nShall I go ahead and submit this ticket?`,
      1100,
      () => {
        setChipType('confirm');
        setQuickReplies(['Confirm & Submit', 'Edit Details', 'Cancel']);
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
        botReply(
          `Ticket **${id}** submitted!\n\n${ticketData.category} — ${ticketData.subType || 'General'}\nPriority: ${ticketData.priority}\n\nExpected response within ${eta}.\n\nYou'll receive email updates as the status changes. Track your ticket in "My Tickets".`,
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

  // STEP 5: post-submit navigation
  const handleDone = (text) => {
    const t = text.toLowerCase();
    if (t.includes('view') || t.includes('my tickets')) {
      navigate('/my-tickets');
    } else if (t.includes('another') || t.includes('new') || t.includes('raise')) {
      window.location.reload();
    } else {
      botReply("You can view your ticket in 'My Tickets' or raise a new one anytime.", 800, () => {
        setChipType('done');
        setQuickReplies(['View My Tickets', 'Raise Another Ticket']);
      });
    }
  };

  const inputPlaceholder =
    flowStep === 1
      ? 'Describe your IT issue…'
      : flowStep === 2
      ? 'Select a sub-type above or type it…'
      : flowStep === 3
      ? 'Provide more details about the issue…'
      : flowStep === 4
      ? 'Type "yes" to confirm, "edit" to change, or "cancel"…'
      : 'What would you like to do next?';

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-6">
          {/* ── Chat panel ── */}
          <div
            className="flex flex-col bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden"
            style={{ height: 'calc(100vh - 200px)', minHeight: '540px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#27272a] shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-md shadow-[#3b82f6]/20">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
                    </svg>
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22c55e] rounded-full border-2 border-[#18181b]" />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-[#fafafa]">TicketFlow AI</p>
                  <p className="text-[11px] text-[#22c55e]">● Online — typically replies instantly</p>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New chat
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {messages.map((msg, i) => (
                <ChatBubble key={i} {...msg} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Category grid (step 1) */}
            {chipType === 'category' && <CategoryGrid onSelect={userSend} />}

            {/* Quick-reply chips (all other steps) */}
            {chipType && chipType !== 'category' && quickReplies.length > 0 && (
              <div className="px-4 pb-3 pt-3 border-t border-[#27272a] shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  {quickReplies.map((q) => (
                    <QuickReply
                      key={q}
                      label={q}
                      onClick={userSend}
                      variant={
                        q.includes('❌') || q.toLowerCase().includes('cancel')
                          ? 'warning'
                          : q.includes('✅') || q.toLowerCase().includes('submit')
                          ? 'success'
                          : 'default'
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="px-4 pb-4 pt-2 shrink-0">
              <div className="flex items-end gap-2 bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 focus-within:border-[#3b82f6]/60 transition-colors">
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
                  className="flex-1 bg-transparent text-[13.5px] text-[#fafafa] placeholder-[#52525b] resize-none outline-none leading-relaxed py-1"
                  style={{ minHeight: '24px', maxHeight: '120px' }}
                  disabled={submitted && chipType === null}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors mb-0.5"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" />
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-[#52525b] text-center mt-2">
                <kbd className="px-1 py-0.5 rounded bg-[#27272a] text-[#a1a1aa] text-[10px]">Enter</kbd>
                {' '}to send ·{' '}
                <kbd className="px-1 py-0.5 rounded bg-[#27272a] text-[#a1a1aa] text-[10px]">Shift+Enter</kbd>
                {' '}for new line
              </p>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="hidden lg:flex flex-col gap-4" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {/* Duplicate ticket warning */}
            {similarTickets.length > 0 && flowStep >= 2 && !submitted && (
              <div className="bg-[#18181b] border border-[#f59e0b]/40 rounded-xl p-4 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-3.5 h-3.5 text-[#f59e0b] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p className="text-[11px] font-semibold text-[#f59e0b] uppercase tracking-wider">Similar Open Tickets</p>
                </div>
                <p className="text-[11.5px] text-[#71717a] mb-2">You may already have an open ticket for this issue:</p>
                <div className="space-y-1.5">
                  {similarTickets.map((t) => (
                    <a key={t._id} href={`/tickets/${t._id}`}
                      className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] transition-colors block"
                    >
                      <span className="text-[10px] font-mono text-[#3b82f6] shrink-0 mt-0.5">{t.ticketId}</span>
                      <span className="text-[11.5px] text-[#a1a1aa] leading-tight line-clamp-2">{t.title}</span>
                    </a>
                  ))}
                </div>
                <button
                  onClick={() => setSimilarTickets([])}
                  className="mt-2 text-[11px] text-[#52525b] hover:text-[#a1a1aa] underline"
                >
                  Dismiss — raise a new ticket anyway
                </button>
              </div>
            )}

            {/* Progress */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shrink-0">
              <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-4">Ticket Progress</p>
              <StepProgress currentStep={flowStep} />
            </div>

            {/* Live preview */}
            {ticketData.category && (
              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shrink-0 space-y-2.5">
                <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider">Live Preview</p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#52525b]">Category</span>
                  <span className="text-[12px] text-[#e4e4e7] font-medium flex items-center gap-1">
                    {(() => { const Icon = CATEGORY_ICONS[ticketData.category]; return Icon ? <Icon className="w-3.5 h-3.5" style={{ color: CATEGORIES[ticketData.category]?.color }} /> : null; })()}
                    {ticketData.category}
                  </span>
                </div>

                {ticketData.subType && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#52525b]">Sub-type</span>
                    <span className="text-[11.5px] text-[#a1a1aa] text-right max-w-[180px]">{ticketData.subType}</span>
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

                {ticketData.description && (
                  <div className="pt-2 border-t border-[#27272a]">
                    <span className="text-[11px] text-[#52525b] block mb-1">Description</span>
                    <p className="text-[11.5px] text-[#a1a1aa] leading-relaxed line-clamp-4">
                      {ticketData.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Browse all categories */}
            {flowStep === 1 && (
              <>
              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 shrink-0">
                <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Browse Categories</p>
                <div className="space-y-0.5">
                  {CATEGORY_NAMES.map((name) => {
                    const cfg = CATEGORIES[name];
                    return (
                      <button
                        key={name}
                        onClick={() => userSend(name)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#27272a] transition-colors text-left group"
                      >
                        {(() => { const Icon = CATEGORY_ICONS[name]; return Icon ? <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} /> : null; })()}
                        <span className="text-[12px] text-[#71717a] group-hover:text-[#fafafa] transition-colors">{name}</span>
                        <svg className="w-3 h-3 text-[#3f3f46] group-hover:text-[#3b82f6] ml-auto transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>
              <TemplatesPanel onSelect={userSend} />
              </>
            )}

            {/* Tips */}
            {flowStep <= 2 && (
              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shrink-0">
                <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Tips for Faster Support</p>
                <ul className="space-y-2">
                  {[
                    'Mention the device make / model',
                    'Include any error codes you see',
                    'Note when the issue first started',
                    'Describe steps already tried',
                    'State if others are also affected',
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-[11.5px] text-[#71717a]">
                      <span className="text-[#3b82f6] mt-0.5 text-[8px] flex-shrink-0">●</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shrink-0">
              <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-3">Quick Actions</p>
              <div className="space-y-1">
                <button
                  onClick={() => navigate('/my-tickets')}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12.5px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors text-left"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                  </svg>
                  View My Tickets
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12.5px] text-[#71717a] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors text-left"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset / New Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Chatbot;
