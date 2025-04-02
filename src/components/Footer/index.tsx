import { Box, Container, Typography, styled } from '@mui/material';

const FooterWrapper = styled(Container)(
  ({ theme }) => `
        margin-top: ${theme.spacing(4)};
        display: flex;
        justify-content: center;
`
);

function Footer() {
  return (
    <FooterWrapper className="footer-wrapper" maxWidth="md">
      <Box
        mb={2}
        display="flex"
        alignItems="center"
        justifyContent="center"
        width="100%"
        textAlign="center"
      >
        <Typography variant="subtitle1">
          &copy; 2025 - All rights reserved
        </Typography>
      </Box>
    </FooterWrapper>
  );
}

export default Footer;
