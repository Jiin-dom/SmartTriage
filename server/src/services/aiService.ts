// Enhanced rule-based NLP / scoring for ticket analysis with improved keyword detection and sentiment analysis

export interface AiAnalysisInput {
  title: string
  description: string
}

export interface AiAnalysisResult {
  predicted_category: string
  category_confidence: number
  urgency_score: number
  urgency_level: 'low' | 'medium' | 'high'
  sentiment_score: number
  sentiment_label: 'calm' | 'frustrated' | 'angry'
  priority_score: number
  priority_level: 'low' | 'medium' | 'high' | 'critical'
  summary: string
  suggested_steps: string
  explanation_json: Record<string, any>
}

// Expanded urgency keywords with phrases and context-aware detection
const URGENCY_KEYWORDS = {
  critical: [
    'system down', 'service down', 'complete outage', 'total failure', 'cannot access',
    'all users affected', 'entire system', 'production down', 'site down', 'app down',
    'complete blackout', 'total outage', 'everything is down', 'nothing works',
    'emergency', 'asap', 'as soon as possible', 'immediately', 'right now'
  ],
  high: [
    'down', 'offline', 'cannot', 'unable', 'outage', 'critical', 'urgent', 'blocked',
    'not working', 'broken', 'failed', 'failure', 'crash', 'crashed', 'stopped',
    'unresponsive', 'timeout', 'hanging', 'freezing', 'frozen', 'stuck',
    'preventing', 'blocking', 'stopping', 'interrupting', 'disrupting',
    'severe', 'major', 'significant', 'serious', 'critical issue'
  ],
  medium: [
    'slow', 'delay', 'delayed', 'issue', 'problem', 'error', 'failing', 'bug',
    'glitch', 'malfunction', 'inconsistent', 'intermittent', 'occasional',
    'sometimes', 'unstable', 'unreliable', 'degraded', 'performance issue',
    'not responding', 'taking too long', 'slower than usual'
  ],
  low: [
    'question', 'inquiry', 'wondering', 'curious', 'information', 'clarification',
    'suggestion', 'feedback', 'improvement', 'enhancement', 'nice to have'
  ]
}

// Enhanced sentiment keywords with phrases and emotional indicators
const SENTIMENT_KEYWORDS = {
  angry: [
    // Direct anger words
    'angry', 'furious', 'unacceptable', 'outraged', 'livid', 'enraged', 'irate',
    'disgusted', 'appalled', 'horrified', 'infuriated', 'incensed',
    // Phrases indicating anger
    'this is ridiculous', 'absolutely unacceptable', 'completely unacceptable',
    'worst service', 'terrible experience', 'awful', 'horrible', 'disgusting',
    'i want a refund', 'i want my money back', 'cancel my account', 'i\'m done',
    'never using', 'switching to', 'competitor', 'better service',
    // Escalation language
    'escalate', 'escalation', 'manager', 'supervisor', 'ceo', 'legal action',
    'lawyer', 'complaint', 'file complaint', 'better business bureau',
    // Strong negative phrases
    'waste of time', 'waste of money', 'ripped off', 'scammed', 'fraud',
    'terrible', 'awful', 'horrible', 'worst', 'pathetic', 'useless'
  ],
  frustrated: [
    // Direct frustration words
    'frustrated', 'disappointed', 'annoyed', 'upset', 'irritated', 'bothered',
    'concerned', 'worried', 'troubled', 'dissatisfied', 'unhappy',
    // Phrases indicating frustration
    'not happy', 'not satisfied', 'not working', 'still not', 'again',
    'for the third time', 'multiple times', 'repeatedly', 'keep happening',
    'still waiting', 'waiting for', 'no response', 'no reply', 'ignored',
    'no one is helping', 'no help', 'can\'t get help', 'getting nowhere',
    // Time-based frustration
    'been waiting', 'waiting days', 'waiting weeks', 'took too long',
    'taking forever', 'too slow', 'delayed response', 'late response'
  ],
  calm: [
    'please', 'thank you', 'thanks', 'appreciate', 'grateful', 'helpful',
    'wondering if', 'would like to', 'could you', 'is it possible',
    'just checking', 'quick question', 'when you have a chance'
  ]
}

// Category keywords with confidence scoring
const CATEGORY_KEYWORDS: Record<string, { keywords: string[]; phrases: string[]; confidence: number }> = {
  Authentication: {
    keywords: ['login', 'auth', 'sso', 'password', 'credential', 'access', 'signin', 'sign-in', 'log in', 'log-in'],
    phrases: ['cannot login', 'login not working', 'access denied', 'authentication failed', 'invalid credentials', 'wrong password', 'forgot password', 'reset password', 'locked out', 'account locked'],
    confidence: 0.90
  },
  'Account Problem': {
    keywords: ['account', 'profile', 'user', 'signup', 'sign-up', 'registration', 'sign up', 'register'],
    phrases: ['create account', 'new account', 'account setup', 'account settings', 'update profile', 'change email', 'verify account', 'account verification', 'account suspended', 'account deleted'],
    confidence: 0.85
  },
  Billing: {
    keywords: ['billing', 'invoice', 'payment', 'charge', 'refund', 'subscription', 'payment method', 'credit card', 'debit', 'paypal', 'stripe'],
    phrases: ['billing issue', 'payment failed', 'chargeback', 'unauthorized charge', 'wrong amount', 'overcharged', 'undercharged', 'billing error', 'subscription cancelled', 'renewal', 'auto-renew'],
    confidence: 0.90
  },
  'Technical Issue': {
    keywords: ['error', 'bug', 'crash', 'broken', 'not working', 'technical', 'issue', 'problem', 'malfunction'],
    phrases: ['application error', 'system error', 'runtime error', 'compilation error', 'bug report', 'software bug', 'application crash', 'system crash', 'blue screen', 'white screen', 'blank page'],
    confidence: 0.80
  },
  'Feature Request': {
    keywords: ['feature', 'request', 'suggest', 'enhancement', 'improve', 'add', 'wish', 'idea', 'proposal'],
    phrases: ['feature request', 'new feature', 'add feature', 'would like', 'it would be nice', 'suggest adding', 'enhancement request', 'improvement suggestion'],
    confidence: 0.75
  },
  API: {
    keywords: ['api', 'endpoint', 'integration', 'webhook', 'rest', 'graphql', 'json', 'xml'],
    phrases: ['api error', 'api down', 'api not working', 'endpoint error', 'integration issue', 'webhook failed', 'api call', 'api request', 'api response'],
    confidence: 0.85
  },
  Database: {
    keywords: ['database', 'db', 'query', 'sql', 'postgres', 'mysql', 'mongodb', 'data'],
    phrases: ['database error', 'query error', 'sql error', 'database connection', 'connection timeout', 'query timeout', 'slow query', 'database performance', 'data corruption', 'data loss'],
    confidence: 0.85
  },
  Performance: {
    keywords: ['performance', 'slow', 'speed', 'latency', 'response time', 'load time', 'timeout'],
    phrases: ['slow performance', 'performance issue', 'slow loading', 'taking too long', 'response time', 'page load', 'slow query', 'performance degradation', 'sluggish'],
    confidence: 0.80
  },
  Security: {
    keywords: ['security', 'breach', 'hack', 'hacked', 'unauthorized', 'suspicious', 'malware', 'virus', 'phishing', 'vulnerability'],
    phrases: ['security issue', 'security breach', 'data breach', 'unauthorized access', 'suspicious activity', 'security vulnerability', 'potential hack', 'account compromised'],
    confidence: 0.90
  },
  Integration: {
    keywords: ['integration', 'connect', 'sync', 'import', 'export', 'third-party', 'third party'],
    phrases: ['integration issue', 'integration error', 'sync failed', 'sync not working', 'connection failed', 'import error', 'export error', 'third-party integration'],
    confidence: 0.80
  }
}

// Helper function to check for phrases (more accurate than single words)
function containsPhrase(text: string, phrases: string[]): boolean {
  return phrases.some(phrase => text.includes(phrase.toLowerCase()))
}

// Helper function to count keyword matches
function countKeywordMatches(text: string, keywords: string[]): number {
  return keywords.filter(kw => text.includes(kw.toLowerCase())).length
}

export function analyzeTicket(input: AiAnalysisInput): AiAnalysisResult {
  const text = `${input.title} ${input.description}`.toLowerCase()
  const title = input.title.toLowerCase()
  const description = input.description.toLowerCase()

  // Enhanced urgency scoring with phrase detection
  let urgencyScore = 0
  
  // Check critical phrases first (highest weight)
  const criticalMatches = countKeywordMatches(text, URGENCY_KEYWORDS.critical)
  urgencyScore += criticalMatches * 5 // Critical phrases get highest weight
  
  // Check high urgency keywords
  const highMatches = countKeywordMatches(text, URGENCY_KEYWORDS.high)
  urgencyScore += highMatches * 3
  
  // Check medium urgency keywords
  const mediumMatches = countKeywordMatches(text, URGENCY_KEYWORDS.medium)
  urgencyScore += mediumMatches * 1
  
  // Title gets extra weight (users often put urgent info in title)
  const titleUrgency = countKeywordMatches(title, [...URGENCY_KEYWORDS.critical, ...URGENCY_KEYWORDS.high])
  urgencyScore += titleUrgency * 2
  
  urgencyScore = Math.min(10, urgencyScore)

  let urgencyLevel: AiAnalysisResult['urgency_level'] = 'low'
  if (urgencyScore >= 7) urgencyLevel = 'high'
  else if (urgencyScore >= 3) urgencyLevel = 'medium'

  // Enhanced sentiment analysis
  let sentimentScore = 0
  let sentimentLabel: AiAnalysisResult['sentiment_label'] = 'calm'
  
  // Check for angry sentiment (phrases first, then keywords)
  const angryPhrases = containsPhrase(text, SENTIMENT_KEYWORDS.angry.filter(k => k.includes(' ')))
  const angryKeywords = countKeywordMatches(text, SENTIMENT_KEYWORDS.angry.filter(k => !k.includes(' ')))
  
  if (angryPhrases) {
    sentimentScore += 5 // Phrases indicate stronger emotion
  }
  sentimentScore += angryKeywords * 3
  
  // Check for frustrated sentiment
  const frustratedPhrases = containsPhrase(text, SENTIMENT_KEYWORDS.frustrated.filter(k => k.includes(' ')))
  const frustratedKeywords = countKeywordMatches(text, SENTIMENT_KEYWORDS.frustrated.filter(k => !k.includes(' ')))
  
  if (frustratedPhrases) {
    sentimentScore += 2
  }
  sentimentScore += frustratedKeywords * 1
  
  // Title sentiment gets extra weight
  const titleAngry = containsPhrase(title, SENTIMENT_KEYWORDS.angry) || countKeywordMatches(title, SENTIMENT_KEYWORDS.angry.filter(k => !k.includes(' '))) > 0
  if (titleAngry) sentimentScore += 2
  
  if (sentimentScore >= 5) sentimentLabel = 'angry'
  else if (sentimentScore >= 2) sentimentLabel = 'frustrated'

  // Enhanced category classification with phrase matching and confidence scoring
  let category = 'General'
  let categoryConfidence = 0.5
  let categoryScore = 0
  let bestCategory = 'General'
  let bestScore = 0

  // Score each category
  for (const [catName, catData] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0
    
    // Phrase matches get higher weight
    const phraseMatches = catData.phrases.filter(phrase => text.includes(phrase.toLowerCase())).length
    score += phraseMatches * 3
    
    // Keyword matches
    const keywordMatches = countKeywordMatches(text, catData.keywords)
    score += keywordMatches * 1
    
    // Title matches get extra weight
    const titleMatches = countKeywordMatches(title, catData.keywords)
    score += titleMatches * 2
    
    if (score > bestScore) {
      bestScore = score
      bestCategory = catName
      categoryScore = score
    }
  }

  if (bestScore > 0) {
    category = bestCategory
    // Calculate confidence based on match strength
    const maxPossibleScore = Math.max(5, categoryScore) // Normalize
    categoryConfidence = Math.min(0.95, 0.5 + (categoryScore / maxPossibleScore) * 0.45)
    categoryConfidence = Math.max(categoryConfidence, CATEGORY_KEYWORDS[category].confidence * 0.8)
  }

  // Business rules: Critical infrastructure issues get higher weight
  let businessRuleBonus = 0
  const criticalInfrastructurePhrases = [
    'system down', 'service down', 'complete outage', 'all users', 'entire system',
    'production down', 'site down', 'app down', 'everything is down', 'nothing works'
  ]
  const isCriticalInfrastructure = criticalInfrastructurePhrases.some(p => text.includes(p)) ||
    (urgencyScore >= 7 && containsPhrase(text, ['all users', 'everyone', 'entire', 'complete']))
  
  if (isCriticalInfrastructure) {
    businessRuleBonus = 3 // System downtime = critical priority boost
  } else if (category === 'Authentication' && urgencyLevel === 'high') {
    businessRuleBonus = 2 // Auth issues affecting users = high priority
  } else if (category === 'Billing' && (urgencyLevel === 'high' || sentimentLabel === 'angry')) {
    businessRuleBonus = 2 // Billing issues with urgency/anger = high priority
  } else if (category === 'Security' && urgencyLevel !== 'low') {
    businessRuleBonus = 2 // Security issues always get priority boost
  } else if (category === 'Billing' && urgencyLevel === 'medium') {
    businessRuleBonus = 1 // Billing issues = moderate priority boost
  }

  // Priority score based on urgency + sentiment + business rules
  let priorityScore = urgencyScore
  if (sentimentLabel === 'angry') priorityScore += 2
  else if (sentimentLabel === 'frustrated') priorityScore += 1
  
  priorityScore += businessRuleBonus
  priorityScore = Math.min(10, priorityScore)

  let priorityLevel: AiAnalysisResult['priority_level'] = 'low'
  if (priorityScore >= 8) priorityLevel = 'critical'
  else if (priorityScore >= 5) priorityLevel = 'high'
  else if (priorityScore >= 3) priorityLevel = 'medium'

  // Generate better summary (first sentence or first 200 chars)
  const summary = input.description.split(/[.!?]/)[0].slice(0, 200) || input.description.slice(0, 200)

  // Generate personalized suggested actions
  const suggestedSteps = generatePersonalizedActions({
    category,
    priorityLevel,
    urgencyLevel,
    urgencyScore,
    sentimentLabel,
    isCriticalInfrastructure,
    text,
    title: input.title,
  })

  // Generate detailed reasoning
  const detailedReasoning = generateDetailedReasoning({
    category,
    categoryConfidence,
    urgencyScore,
    urgencyLevel,
    sentimentScore,
    sentimentLabel,
    priorityScore,
    priorityLevel,
    businessRuleBonus,
    isCriticalInfrastructure,
    text,
    title: input.title,
    categoryScore,
  })

  return {
    predicted_category: category,
    category_confidence: categoryConfidence,
    urgency_score: urgencyScore,
    urgency_level: urgencyLevel,
    sentiment_score: sentimentScore,
    sentiment_label: sentimentLabel,
    priority_score: priorityScore,
    priority_level: priorityLevel,
    summary,
    suggested_steps: suggestedSteps,
    explanation_json: {
      rules: {
        urgencyScore,
        sentimentScore,
        businessRuleBonus,
        isCriticalInfrastructure,
        categoryScore,
      },
      derivedFrom: 'Enhanced rule-based heuristics with phrase detection, keyword analysis, sentiment detection, and business rule weighting',
      reasoning: detailedReasoning,
    },
  }
}

function generatePersonalizedActions(params: {
  category: string
  priorityLevel: string
  urgencyLevel: string
  urgencyScore: number
  sentimentLabel: string
  isCriticalInfrastructure: boolean
  text: string
  title: string
}): string {
  const { category, priorityLevel, urgencyLevel, urgencyScore, sentimentLabel, isCriticalInfrastructure, text, title } = params

  // Critical infrastructure issues
  if (isCriticalInfrastructure) {
    return `🚨 IMMEDIATE ACTION REQUIRED:
1. Acknowledge the incident within 5 minutes and post status update
2. Notify on-call engineering team and escalate to infrastructure lead
3. Check system health dashboards and error logs immediately
4. Identify affected services and estimate user impact
5. Begin root cause analysis while implementing temporary mitigation
6. Set up war room if multiple services affected
7. Update stakeholders every 30 minutes until resolved`
  }

  // Category-specific actions
  if (category === 'Authentication') {
    if (urgencyLevel === 'high' || priorityLevel === 'critical') {
      return `🔐 Authentication Issue - High Priority:
1. Verify if this affects all users or specific accounts (check user reports)
2. Review authentication service logs for errors or anomalies
3. Check for recent deployments or configuration changes to auth system
4. Test login flow in staging environment to reproduce issue
5. If widespread, consider temporary workaround (password reset flow, SSO bypass)
6. Coordinate with security team if potential breach suspected
7. Monitor authentication success/failure rates in real-time`
    } else {
      return `🔐 Authentication Issue:
1. Gather specific error messages and affected user accounts
2. Check if issue is reproducible or isolated to specific scenarios
3. Review authentication logs for the reported time period
4. Test login flow with provided credentials (if shared securely)
5. Verify account status (locked, suspended, or active)
6. Provide user with troubleshooting steps while investigating`
    }
  }

  if (category === 'Billing') {
    if (sentimentLabel === 'angry' || priorityLevel === 'high') {
      return `💳 Billing Issue - Customer Escalation:
1. Acknowledge immediately and apologize for the inconvenience
2. Review customer's billing history and recent transactions
3. Verify payment method status and any failed payment attempts
4. Check for system errors in billing processing for this account
5. If overcharge confirmed, initiate refund process immediately
6. If undercharge, contact customer to resolve payment
7. Document resolution and follow up within 24 hours to ensure satisfaction`
    } else {
      return `💳 Billing Inquiry:
1. Review customer's account billing details and invoice history
2. Check for any pending charges or subscription changes
3. Verify payment method on file and next billing date
4. Provide clear explanation of charges or answer specific question
5. If refund needed, verify eligibility and process according to policy
6. Document interaction for future reference`
    }
  }

  if (category === 'Technical Issue') {
    if (urgencyScore >= 7) {
      return `⚙️ Technical Issue - High Urgency:
1. Reproduce the issue in development/staging environment
2. Check application error logs and stack traces for the reported time
3. Review recent code deployments that might have introduced the bug
4. Identify affected user segments (all users, specific browsers, regions)
5. Check related system dependencies (APIs, databases, third-party services)
6. If production-breaking, prepare hotfix deployment
7. Create detailed bug report with reproduction steps for engineering team`
    } else {
      return `⚙️ Technical Issue:
1. Gather detailed reproduction steps from the user
2. Check error logs for the reported time period and user context
3. Verify if issue is reproducible in our test environment
4. Review similar past tickets for known workarounds
5. Test affected functionality with different browsers/devices if applicable
6. Document findings and escalate to development team if needed`
    }
  }

  if (category === 'API') {
    return `🔌 API Issue:
1. Check API endpoint status and response times in monitoring dashboard
2. Review API error logs for 5xx errors during reported time window
3. Verify API rate limits haven't been exceeded for this client
4. Test the specific endpoint with provided request details
5. Check for recent API version changes or deprecations
6. Review API documentation to confirm expected behavior
7. If integration issue, coordinate with client's development team`
  }

  if (category === 'Database') {
    return `🗄️ Database Issue:
1. Check database connection pool status and query performance metrics
2. Review slow query logs for the reported time period
3. Verify database server health and resource utilization (CPU, memory, disk)
4. Check for any recent migrations or schema changes
5. Review query execution plans if specific queries are failing
6. Check for database locks or deadlocks in logs
7. Coordinate with DBA team if performance degradation detected`
  }

  if (category === 'Performance') {
    return `⚡ Performance Issue:
1. Check application performance metrics and response times
2. Review server resource utilization (CPU, memory, disk I/O)
3. Analyze slow query logs and database performance
4. Check CDN and caching layer effectiveness
5. Review recent code changes that might impact performance
6. Identify bottlenecks using profiling tools
7. Test performance in staging environment to reproduce issue`
  }

  if (category === 'Security') {
    return `🔒 Security Issue - HIGH PRIORITY:
1. Immediately assess the severity and scope of the security concern
2. Review security logs and access patterns for suspicious activity
3. Check for any unauthorized access attempts or breaches
4. Verify if customer data or sensitive information is at risk
5. Coordinate with security team and follow incident response procedures
6. If confirmed breach, notify affected users and relevant authorities if required
7. Document all findings and remediation steps taken`
  }

  if (category === 'Integration') {
    return `🔗 Integration Issue:
1. Verify integration status and connection health in monitoring dashboard
2. Check integration logs for errors during the reported time period
3. Test the integration endpoint or webhook manually
4. Verify API credentials and authentication tokens are valid
5. Check for recent changes to integration configuration or third-party service
6. Review integration documentation and verify expected behavior
7. Coordinate with third-party service support if needed`
  }

  if (category === 'Account Problem') {
    return `👤 Account Issue:
1. Verify account status and any restrictions (suspended, locked, etc.)
2. Check account creation/update logs for anomalies
3. Review user permissions and role assignments
4. Test account access with provided credentials (if shared securely)
5. Check for any automated actions that might have affected the account
6. Verify email address and account recovery options
7. Provide step-by-step resolution or escalate to account management team`
  }

  if (category === 'Feature Request') {
    return `💡 Feature Request:
1. Review existing feature backlog and roadmap for similar requests
2. Assess technical feasibility and development effort required
3. Evaluate business value and user impact of this feature
4. Check if similar functionality exists in current system
5. Gather additional requirements or use cases from the requester
6. Log in product management system for prioritization
7. Provide timeline estimate if approved for development`
  }

  // Priority-based fallback actions
  if (priorityLevel === 'critical') {
    return `🚨 Critical Priority Actions:
1. Acknowledge immediately and assign to senior engineer
2. Assess impact scope (users affected, revenue impact, system stability)
3. Notify relevant stakeholders and set up communication channel
4. Begin immediate investigation with highest priority
5. Implement temporary workaround if available
6. Coordinate cross-functional team if needed
7. Provide status updates every hour until resolved`
  }

  if (priorityLevel === 'high') {
    return `⚠️ High Priority Actions:
1. Acknowledge within 1 hour and assign to appropriate team member
2. Gather all relevant details and context from the ticket
3. Review similar past incidents for quick resolution patterns
4. Begin investigation within 2-4 hours
5. Keep requester informed of progress
6. Escalate if resolution requires additional resources
7. Document resolution for knowledge base`
  }

  if (priorityLevel === 'medium') {
    return `📋 Medium Priority Actions:
1. Acknowledge within 4 hours during business hours
2. Review ticket details and request any missing information
3. Plan investigation within 24 hours
4. Check knowledge base for known solutions
5. Provide regular updates to requester
6. Follow standard resolution process
7. Document solution for future reference`
  }

  // Low priority default
  return `📝 Standard Actions:
1. Acknowledge within 24 hours
2. Review ticket and categorize appropriately
3. Request additional details if needed
4. Plan investigation within standard SLA timeframe
5. Keep requester informed of progress
6. Resolve according to standard procedures
7. Close ticket with resolution summary`
}

function generateDetailedReasoning(params: {
  category: string
  categoryConfidence: number
  urgencyScore: number
  urgencyLevel: string
  sentimentScore: number
  sentimentLabel: string
  priorityScore: number
  priorityLevel: string
  businessRuleBonus: number
  isCriticalInfrastructure: boolean
  text: string
  title: string
  categoryScore: number
}): string {
  const {
    category,
    categoryConfidence,
    urgencyScore,
    urgencyLevel,
    sentimentScore,
    sentimentLabel,
    priorityScore,
    priorityLevel,
    businessRuleBonus,
    isCriticalInfrastructure,
    text,
    title,
    categoryScore,
  } = params

  // Detect specific keywords and phrases found
  const detectedUrgencyKeywords: string[] = []
  const detectedSentimentKeywords: string[] = []
  
  // Find urgency keywords
  const allUrgencyKeywords = [...URGENCY_KEYWORDS.critical, ...URGENCY_KEYWORDS.high, ...URGENCY_KEYWORDS.medium]
  allUrgencyKeywords.forEach((kw) => {
    if (text.includes(kw.toLowerCase())) detectedUrgencyKeywords.push(kw)
  })
  
  // Find sentiment keywords
  const allSentimentKeywords = [...SENTIMENT_KEYWORDS.angry, ...SENTIMENT_KEYWORDS.frustrated]
  allSentimentKeywords.forEach((kw) => {
    if (text.includes(kw.toLowerCase())) detectedSentimentKeywords.push(kw)
  })

  let reasoning = `Based on comprehensive analysis of the ticket content, I've assigned the following priority assessment:\n\n`

  // Urgency reasoning with specific keywords
  reasoning += `🔍 URGENCY LEVEL: ${urgencyLevel.toUpperCase()} (Score: ${urgencyScore}/10)\n`
  if (urgencyScore >= 7) {
    const topKeywords = detectedUrgencyKeywords.slice(0, 5)
    reasoning += `High urgency detected due to critical keywords and phrases found: "${topKeywords.join('", "')}". `
    if (isCriticalInfrastructure) {
      reasoning += `The ticket indicates system-wide impact affecting all users, which requires immediate attention. `
    } else {
      reasoning += `These keywords suggest a blocking issue preventing normal operations. `
    }
    if (urgencyScore >= 9) {
      reasoning += `The extremely high urgency score indicates a production-critical issue that must be addressed immediately. `
    }
  } else if (urgencyScore >= 3) {
    const topKeywords = detectedUrgencyKeywords.slice(0, 3)
    reasoning += `Medium urgency identified from keywords like "${topKeywords.join('", "')}". `
    reasoning += `This indicates a significant issue that impacts functionality but may have workarounds. `
  } else {
    reasoning += `Low urgency assessment based on the ticket content. `
    reasoning += `The issue appears to be non-blocking or can be addressed during normal business operations. `
  }

  // Sentiment reasoning with specific keywords
  reasoning += `\n\n😊 CUSTOMER SENTIMENT: ${sentimentLabel.toUpperCase()} (Score: ${sentimentScore})\n`
  if (sentimentLabel === 'angry') {
    const angryKeywords = detectedSentimentKeywords.filter(k => SENTIMENT_KEYWORDS.angry.includes(k)).slice(0, 3)
    reasoning += `Strong negative sentiment detected (${sentimentScore} points), indicating customer frustration or dissatisfaction. `
    if (angryKeywords.length > 0) {
      reasoning += `Keywords like "${angryKeywords.join('", "')}" indicate high emotional distress. `
    }
    reasoning += `This elevates priority as it may lead to churn or negative feedback. `
    reasoning += `Immediate acknowledgment and resolution are recommended to preserve customer relationship. `
  } else if (sentimentLabel === 'frustrated') {
    const frustratedKeywords = detectedSentimentKeywords.filter(k => SENTIMENT_KEYWORDS.frustrated.includes(k)).slice(0, 3)
    reasoning += `Moderate frustration detected (${sentimentScore} points) in the ticket language. `
    if (frustratedKeywords.length > 0) {
      reasoning += `Phrases like "${frustratedKeywords.join('", "')}" suggest the customer has likely experienced repeated issues or delays. `
    }
    reasoning += `Proactive communication and timely resolution are important to prevent escalation. `
  } else {
    reasoning += `Neutral or calm sentiment detected (${sentimentScore} points). `
    reasoning += `The customer appears to be reporting the issue professionally without strong emotional indicators. `
  }

  // Category reasoning with confidence
  reasoning += `\n\n📂 CATEGORY: ${category} (Confidence: ${Math.round(categoryConfidence * 100)}%, Match Score: ${categoryScore})\n`
  if (categoryScore > 0) {
    reasoning += `This category was identified with ${categoryScore} matching keyword/phrase points. `
  }
  
  if (category === 'Authentication') {
    reasoning += `Authentication issues are critical as they directly impact user access. `
    if (urgencyLevel === 'high') {
      reasoning += `Given the high urgency, this likely affects multiple users or prevents core functionality. `
    }
  } else if (category === 'Billing') {
    reasoning += `Billing issues require careful handling as they affect customer trust and revenue. `
    if (sentimentLabel === 'angry') {
      reasoning += `The angry sentiment combined with billing concerns indicates high risk of customer churn. `
    }
  } else if (category === 'Security') {
    reasoning += `Security issues are always high priority as they may involve data breaches or unauthorized access. `
    reasoning += `These require immediate investigation regardless of other factors. `
  } else if (category === 'Technical Issue') {
    reasoning += `Technical issues require investigation to determine root cause and impact scope. `
    if (urgencyScore >= 7) {
      reasoning += `The high urgency suggests this is blocking user workflows or causing significant disruption. `
    }
  } else if (category === 'Performance') {
    reasoning += `Performance issues can significantly impact user experience and may indicate underlying system problems. `
    if (urgencyScore >= 5) {
      reasoning += `The elevated urgency suggests this is noticeably affecting user workflows. `
    }
  } else if (category === 'API' || category === 'Database') {
    reasoning += `${category} issues can have cascading effects on multiple services. `
    reasoning += `These typically require coordination with infrastructure or backend teams. `
  } else if (category === 'Feature Request') {
    reasoning += `Feature requests are enhancement opportunities that don't block current functionality. `
    reasoning += `These are typically prioritized based on business value and user demand. `
  }

  // Priority score reasoning
  reasoning += `\n\n🎯 PRIORITY SCORE: ${priorityScore}/10 (${priorityLevel.toUpperCase()})\n`
  reasoning += `The priority score combines urgency (${urgencyScore}), sentiment impact (+${sentimentLabel === 'angry' ? 2 : sentimentLabel === 'frustrated' ? 1 : 0}), `
  if (businessRuleBonus > 0) {
    reasoning += `and business rule weighting (+${businessRuleBonus} for ${isCriticalInfrastructure ? 'critical infrastructure impact' : category === 'Security' ? 'security issue priority' : `${category} category importance`}). `
  } else {
    reasoning += `with no additional business rule adjustments. `
  }

  if (priorityLevel === 'critical') {
    reasoning += `This critical priority requires immediate escalation and response, typically within minutes to hours. `
  } else if (priorityLevel === 'high') {
    reasoning += `High priority indicates significant impact requiring prompt attention within hours to one business day. `
  } else if (priorityLevel === 'medium') {
    reasoning += `Medium priority suggests moderate impact that should be addressed within standard SLA timeframe. `
  } else {
    reasoning += `Low priority indicates minimal impact that can be handled during normal operations. `
  }

  // Business rule reasoning
  if (businessRuleBonus > 0) {
    reasoning += `\n\n⚡ BUSINESS RULE APPLIED: +${businessRuleBonus} priority boost\n`
    if (isCriticalInfrastructure) {
      reasoning += `System downtime or service unavailability detected. `
      reasoning += `These issues affect all users and require immediate response regardless of other factors. `
    } else if (category === 'Authentication' && urgencyLevel === 'high') {
      reasoning += `Authentication issues with high urgency are escalated due to their impact on user access and security. `
    } else if (category === 'Billing' && (urgencyLevel === 'high' || sentimentLabel === 'angry')) {
      reasoning += `High-urgency or angry billing issues are prioritized to maintain customer trust and prevent revenue loss. `
    } else if (category === 'Security') {
      reasoning += `Security issues always receive priority boost due to potential data breach or unauthorized access risks. `
    }
  }

  reasoning += `\n\n💡 RECOMMENDATION: Based on this analysis, ${priorityLevel === 'critical' ? 'immediate action is required' : priorityLevel === 'high' ? 'prompt attention within hours is recommended' : priorityLevel === 'medium' ? 'standard priority handling is appropriate' : 'this can be addressed during normal operations'}.`

  return reasoning
}
