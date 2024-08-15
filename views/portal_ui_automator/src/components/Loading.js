import { Backdrop, CircularProgress } from '@mui/material';

const Loading = ({ setLoading, loading }) => {
  return (
    <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading} onClick={() => setLoading((prev) => !prev)}>
      <CircularProgress color="inherit" />
    </Backdrop>
  );
};

export default Loading;
