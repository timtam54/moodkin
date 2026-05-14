export interface ParsedUA {
  platform: 'mobile' | 'tablet' | 'desktop'
  browser: string
  os: string
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { platform: 'desktop', browser: 'Unknown', os: 'Unknown' }

  const isTablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua)
  const isMobile = !isTablet && /Mobile|iPhone|iPod|Android/i.test(ua)
  const platform: ParsedUA['platform'] = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  let os = 'Unknown'
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/Mac OS X/i.test(ua)) os = 'macOS'
  else if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Linux/i.test(ua)) os = 'Linux'

  let browser = 'Unknown'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera'
  else if (/Chrome\//i.test(ua) && !/Edg\/|OPR\//i.test(ua)) browser = 'Chrome'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari'

  return { platform, browser, os }
}
