import { alpha, Avatar, Box, styled, Typography } from '@mui/material';

const AvatarWrapper = styled(Avatar)(
  ({ theme }) => `
    margin: ${theme.spacing(0, 0, 1, -0.5)};
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: ${theme.spacing(1)};
    padding: ${theme.spacing(0.5)};
    border-radius: 60px;
    height: ${theme.spacing(7)};
    width: ${theme.spacing(7)};
    background: ${
      theme.palette.mode === 'dark'
        ? theme.colors.alpha.trueWhite[30]
        : alpha(theme.colors.alpha.black[100], 0.07)
    };
  
    img {
      background: ${theme.colors.alpha.trueWhite[100]};
      padding: ${theme.spacing(0.5)};
      display: block;
      border-radius: inherit;
      height: ${theme.spacing(8.8)};
      width: ${theme.spacing(9)};
    }
`
);

const Header = () => {
  return (
    <Box
      textAlign="center"
      py={2}
      display="flex"
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
    >
      <AvatarWrapper>
        <img alt="CNFM-LOGO" src="/images//logos/CNFM-LOGO.png" />
      </AvatarWrapper>
      <Typography variant="h4">Core Network & Facilities Management</Typography>
    </Box>
  );
};

export default Header;
