import { Tab, Tabs } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import TrainIcon from '@mui/icons-material/Train';

const tabs = [
  { label: 'Book ticket', icon: <SearchIcon /> },
  { label: 'PNR status', icon: <ConfirmationNumberIcon /> },
  { label: 'Live trains', icon: <TrainIcon /> }
];

export default function SearchTabs() {
  return (
    <Tabs className="sr-search-tabs" value={0} aria-label="Railway booking services" variant="scrollable" scrollButtons={false}>
      {tabs.map((tab) => <Tab key={tab.label} icon={tab.icon} iconPosition="start" label={tab.label} />)}
    </Tabs>
  );
}
