import React, { useRef, useState } from 'react';

/**
 * OTPInput Component
 * 6-digit OTP input with auto-focus and paste support
 */
const OTPInput = ({ onComplete, error = false }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits entered
    if (newOtp.every(digit => digit !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input on backspace
        inputRefs.current[index - 1]?.focus();
      }
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      onComplete(pastedData);
    }
  };

  return (
    <div className="flex justify-center gap-2 md:gap-3">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          className={`w-11 h-12 text-center text-xl font-['JetBrains_Mono'] font-medium rounded-[7px] transition-colors duration-150
            ${digit ? 'bg-[#18181b] border-[#3f3f46]' : 'bg-[#18181b]'}
            ${error ? 'border-[#ef4444] animate-shake' : 'border-[#27272a]'}
            border focus:border-[#3b82f6] outline-none text-[#fafafa]`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
