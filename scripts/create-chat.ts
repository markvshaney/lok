import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';

const createChat = (topic: string) => {
  const date = format(new Date(), 'yyyy-MM-dd');
  const month = format(new Date(), 'yyyy-MM');
  const fileName = `${date}-${topic.toLowerCase().replace(/\s+/g, '-')}.md`;
  const monthDir = path.join('.cursor-chats', month);
  
  // Create month directory if it doesn't exist
  if (!fs.existsSync(monthDir)) {
    fs.mkdirSync(monthDir, { recursive: true });
  }
  
  // Copy template to new file
  const template = fs.readFileSync('.cursor-chats/template.md', 'utf8');
  const newContent = template
    .replace('[Topic]', topic)
    .replace('[Date]', date);
    
  fs.writeFileSync(path.join(monthDir, fileName), newContent);
  
  // Update README index
  const readme = path.join('.cursor-chats', 'README.md');
  const readmeContent = fs.readFileSync(readme, 'utf8');
  const newEntry = `- [${date}] ${topic}\n`;
  
  fs.writeFileSync(readme, readmeContent.replace('## Chat Index\n', `## Chat Index\n${newEntry}`));
  
  console.log(`Created chat file: ${fileName}`);
  console.log(`Updated index in: ${readme}`);
};

// Handle command line arguments
const topic = process.argv[2];
if (!topic) {
  console.error('Please provide a topic: npm run create-chat "Your Topic"');
  process.exit(1);
}

createChat(topic); 