import React from 'react';

export default function ServerIcon({
  size = 18,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V8C20 9.10457 19.1046 10 18 10H6C4.89543 10 4 9.10457 4 8V6Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M4 12C4 10.8954 4.89543 10 6 10H18C19.1046 10 20 10.8954 20 12V14C20 15.1046 19.1046 16 18 16H6C4.89543 16 4 15.1046 4 14V12Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M4 18C4 16.8954 4.89543 16 6 16H18C19.1046 16 20 16.8954 20 18V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V18Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="7" cy="7" r="1" fill="currentColor" />
      <circle cx="7" cy="13" r="1" fill="currentColor" />
      <circle cx="7" cy="19" r="1" fill="currentColor" />
      <circle cx="10" cy="7" r="1" fill="currentColor" />
      <circle cx="10" cy="13" r="1" fill="currentColor" />
      <circle cx="10" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}