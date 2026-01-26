// Simple rule-based NLP / scoring stub for ticket analysis

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

const URGENCY_KEYWORDS = {
  high: ['down', 'offline', 'cannot', 'unable', 'outage', 'critical', 'urgent', 'blocked'],
  medium: ['slow', 'delay', 'issue', 'problem', 'error', 'failing'],
}

const SENTIMENT_KEYWORDS = {
  angry: ['angry', 'furious', 'unacceptable', 'outraged', 'escalate'],
  frustrated: ['frustrated', 'disappointed', 'annoyed', 'upset'],
}

export function analyzeTicket(input: AiAnalysisInput): AiAnalysisResult {
  const text = `${input.title} ${input.description}`.toLowerCase()

  let urgencyScore = 0
  URGENCY_KEYWORDS.high.forEach((k) => {
    if (text.includes(k)) urgencyScore += 3
  })
  URGENCY_KEYWORDS.medium.forEach((k) => {
    if (text.includes(k)) urgencyScore += 1
  })
  urgencyScore = Math.min(10, urgencyScore)

  let urgencyLevel: AiAnalysisResult['urgency_level'] = 'low'
  if (urgencyScore >= 7) urgencyLevel = 'high'
  else if (urgencyScore >= 3) urgencyLevel = 'medium'

  let sentimentScore = 0
  let sentimentLabel: AiAnalysisResult['sentiment_label'] = 'calm'
  SENTIMENT_KEYWORDS.angry.forEach((k) => {
    if (text.includes(k)) sentimentScore += 3
  })
  SENTIMENT_KEYWORDS.frustrated.forEach((k) => {
    if (text.includes(k)) sentimentScore += 1
  })
  if (sentimentScore >= 3) sentimentLabel = 'angry'
  else if (sentimentScore >= 1) sentimentLabel = 'frustrated'

  // Enhanced category classification
  let category = 'General'
  let categoryConfidence = 0.5

  // Authentication & Account Issues
  if (text.includes('login') || text.includes('auth') || text.includes('sso') || text.includes('password') || text.includes('access denied')) {
    category = 'Authentication'
    categoryConfidence = 0.85
  }
  // Account Problems
  else if (text.includes('account') || text.includes('profile') || text.includes('user') || text.includes('signup') || text.includes('registration')) {
    category = 'Account Problem'
    categoryConfidence = 0.80
  }
  // Billing & Payment
  else if (text.includes('billing') || text.includes('invoice') || text.includes('payment') || text.includes('charge') || text.includes('refund') || text.includes('subscription')) {
    category = 'Billing'
    categoryConfidence = 0.85
  }
  // Technical Issues
  else if (text.includes('error') || text.includes('bug') || text.includes('crash') || text.includes('broken') || text.includes('not working') || text.includes('technical')) {
    category = 'Technical Issue'
    categoryConfidence = 0.80
  }
  // Feature Requests
  else if (text.includes('feature') || text.includes('request') || text.includes('suggest') || text.includes('enhancement') || text.includes('improve') || text.includes('add')) {
    category = 'Feature Request'
    categoryConfidence = 0.75
  }
  // API Issues
  else if (text.includes('api') || text.includes('endpoint') || text.includes('integration')) {
    category = 'API'
    categoryConfidence = 0.85
  }
  // Database Issues
  else if (text.includes('database') || text.includes('db') || text.includes('data') || text.includes('query')) {
    category = 'Database'
    categoryConfidence = 0.85
  }

  // Business rules: Critical infrastructure issues get higher weight
  let businessRuleBonus = 0
  const criticalInfrastructureKeywords = ['down', 'outage', 'offline', 'system down', 'service unavailable', 'cannot access', 'all users']
  const isCriticalInfrastructure = criticalInfrastructureKeywords.some(k => text.includes(k))
  
  if (isCriticalInfrastructure) {
    businessRuleBonus = 3 // System downtime = critical priority boost
  } else if (category === 'Authentication' && urgencyLevel === 'high') {
    businessRuleBonus = 2 // Auth issues affecting users = high priority
  } else if (category === 'Billing' && urgencyLevel === 'high') {
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

  const summary = input.description.slice(0, 200)

  // Generate personalized suggested actions based on category, urgency, sentiment, and specific issues
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

  // Generate detailed reasoning explaining WHY the scores were assigned
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
      },
      derivedFrom: 'Rule-based heuristics with keyword analysis, sentiment detection, and business rule weighting',
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
  } = params

  const detectedKeywords: string[] = []
  const urgencyKeywords = ['down', 'offline', 'cannot', 'unable', 'outage', 'critical', 'urgent', 'blocked', 'slow', 'delay', 'issue', 'problem', 'error', 'failing']
  urgencyKeywords.forEach((kw) => {
    if (text.includes(kw)) detectedKeywords.push(kw)
  })

  let reasoning = `Based on analysis of the ticket content, I've assigned the following priority assessment:\n\n`

  // Urgency reasoning
  reasoning += `🔍 URGENCY LEVEL: ${urgencyLevel.toUpperCase()} (Score: ${urgencyScore}/10)\n`
  if (urgencyScore >= 7) {
    reasoning += `High urgency detected due to critical keywords found: "${detectedKeywords.slice(0, 3).join('", "')}". `
    if (isCriticalInfrastructure) {
      reasoning += `The ticket indicates system-wide impact affecting all users, which requires immediate attention. `
    } else {
      reasoning += `These keywords suggest a blocking issue preventing normal operations. `
    }
  } else if (urgencyScore >= 3) {
    reasoning += `Medium urgency identified from keywords like "${detectedKeywords.slice(0, 2).join('", "')}". `
    reasoning += `This indicates a significant issue that impacts functionality but may have workarounds. `
  } else {
    reasoning += `Low urgency assessment based on the ticket content. `
    reasoning += `The issue appears to be non-blocking or can be addressed during normal business operations. `
  }

  // Sentiment reasoning
  reasoning += `\n\n😊 CUSTOMER SENTIMENT: ${sentimentLabel.toUpperCase()} (Score: ${sentimentScore})\n`
  if (sentimentLabel === 'angry') {
    reasoning += `Strong negative sentiment detected, indicating customer frustration or dissatisfaction. `
    reasoning += `This elevates priority as it may lead to churn or negative feedback. `
    reasoning += `Immediate acknowledgment and resolution are recommended to preserve customer relationship. `
  } else if (sentimentLabel === 'frustrated') {
    reasoning += `Moderate frustration detected in the ticket language. `
    reasoning += `The customer has likely experienced repeated issues or delays. `
    reasoning += `Proactive communication and timely resolution are important. `
  } else {
    reasoning += `Neutral or calm sentiment detected. `
    reasoning += `The customer appears to be reporting the issue professionally without strong emotional indicators. `
  }

  // Category reasoning
  reasoning += `\n\n📂 CATEGORY: ${category} (Confidence: ${Math.round(categoryConfidence * 100)}%)\n`
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
  } else if (category === 'Technical Issue') {
    reasoning += `Technical issues require investigation to determine root cause and impact scope. `
    if (urgencyScore >= 7) {
      reasoning += `The high urgency suggests this is blocking user workflows or causing significant disruption. `
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
    reasoning += `and business rule weighting (+${businessRuleBonus} for ${isCriticalInfrastructure ? 'critical infrastructure impact' : `${category} category importance`}). `
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
    } else if (category === 'Billing' && urgencyLevel === 'high') {
      reasoning += `High-urgency billing issues are prioritized to maintain customer trust and prevent revenue loss. `
    }
  }

  reasoning += `\n\n💡 RECOMMENDATION: Based on this analysis, ${priorityLevel === 'critical' ? 'immediate action is required' : priorityLevel === 'high' ? 'prompt attention within hours is recommended' : priorityLevel === 'medium' ? 'standard priority handling is appropriate' : 'this can be addressed during normal operations'}.`

  return reasoning
}




