// The safety rules. Each rule: words to look for, what happens (block or warn), and why.
// Words are matched whole, without accents and case ("Barça" matches "barca").
// To add a rule, add a line here; nothing else needs to change.

// Real famous people: using their name or face needs a paid deal.
const FAMOUS_PEOPLE = [
  'messi', 'lionel messi', 'leo messi', 'ronaldo', 'cristiano', 'neymar', 'mbappe', 'haaland', 'lamine yamal', 'pique',
  'lebron', 'michael jordan', 'serena williams', 'usain bolt', 'virat kohli', 'sachin tendulkar', 'dhoni',
  'taylor swift', 'beyonce', 'rihanna', 'drake', 'bad bunny', 'shakira', 'bts', 'blackpink', 'zendaya',
  'timothee chalamet', 'shah rukh khan', 'kim kardashian', 'oprah', 'elon musk', 'jensen huang', 'mark zuckerberg',
  'jeff bezos', 'bill gates', 'pope', 'king charles',
];

// Teams, leagues, events and venues: their names and logos are trademarks.
const TRADEMARKS = [
  'fc barcelona', 'barca', 'blaugrana', 'real madrid', 'atletico madrid', 'manchester united', 'man utd', 'man city',
  'manchester city', 'liverpool fc', 'chelsea fc', 'arsenal fc', 'psg', 'paris saint-germain', 'bayern', 'juventus',
  'inter miami', 'camp nou', 'spotify camp nou', 'bernabeu', 'la liga', 'laliga', 'premier league', 'champions league',
  'uefa', 'fifa', 'world cup', 'olympics', 'olympic', 'super bowl', 'nfl', 'nba', 'mlb', 'nhl', 'ipl', 'wimbledon',
  'grammys', 'oscars', 'met gala', 'el clasico',
];

const POLITICS = ['election', 'vote for', 'president', 'prime minister', 'democrat', 'republican', 'independence', 'referendum', 'protest'];
const RELIGION = ['god', 'jesus', 'allah', 'church', 'mosque', 'temple', 'bible', 'quran'];
const TRAGEDY = ['died', 'death', 'dead', 'killed', 'funeral', 'shooting', 'bomb', 'terror', 'terrorist', 'war', 'earthquake', 'tragedy', 'suicide'];
const SWEARING = ['fuck', 'fucking', 'shit', 'bitch', 'bastard', 'asshole', 'cunt', 'dick'];
const UNSAFE = ['drunk', 'drinking game', 'set fire', 'jump off', 'dangerous stunt', 'fireworks in'];

export const RULES = [
  { id: 'famous-person', level: 'block', words: FAMOUS_PEOPLE, why: 'uses a real famous person (needs a paid deal)' },
  { id: 'trademark', level: 'block', words: TRADEMARKS, why: 'uses a team, league, event or venue name (trademark)' },
  { id: 'sponsor-claim', level: 'block', words: ['official sponsor', 'official partner', 'officially licensed', 'endorsed by', 'sponsored by', 'presented by'], why: 'claims an official tie that does not exist' },
  { id: 'official', level: 'warn', words: ['official'], why: 'says "official", which can imply a deal' },
  { id: 'judge-trick', level: 'block', patterns: [/ignore (all |any )?(previous|prior|above) instructions/, /give (this|me|it) a (perfect )?10/, /you are now/, /system prompt/], why: 'tries to trick the AI judge' },
  { id: 'swearing', level: 'block', words: SWEARING, why: 'contains swearing' },
  { id: 'unsafe', level: 'block', words: UNSAFE, why: 'suggests something unsafe' },
  { id: 'tragedy', level: 'warn', words: TRAGEDY, why: 'mentions tragedy or death (easy to get wrong)' },
  { id: 'politics', level: 'warn', words: POLITICS, why: 'touches politics' },
  { id: 'religion', level: 'warn', words: RELIGION, why: 'touches religion' },
];
