interface LogoProps {
  wrapperClassName?: string
  iconClassName?: string
  titleClassName?: string
}

export default function Logo({ wrapperClassName = '', iconClassName = '', titleClassName = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 text-primary ${wrapperClassName}`}>
      <div className={`size-6 ${iconClassName}`}>
        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" fill="currentColor"></path>
        </svg>
      </div>
      <h2
        className={`text-primary text-xl font-extrabold leading-tight tracking-[-0.015em] ${titleClassName}`}
      >
        SmartTriage
      </h2>
    </div>
  )
}



