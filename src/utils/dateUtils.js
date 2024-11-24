export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export const getTodayFormatted = () => {
  return formatDate(new Date());
};

export const getDateFromString = (dateString) => {
  return new Date(dateString);
};
