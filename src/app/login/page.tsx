import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import styles from './page.module.css'
import Button from '@mui/material/Button';

export default function LogInPage() {
    return (
        <div className={styles.page}>
            <Card className={styles.mainCard}>
                <CardContent className={styles.cardContent}>
                    <TextField className={styles.textField} label="E-mail" color="primary" focused />
                    <TextField className={styles.textField} label="Password" color="primary" focused />
                    <span className={styles.buttonContainer}>
                        <Button className={styles.logInButton} variant='contained'>Log in</Button>
                        <Button className={styles.forgotPasswordButton} variant='contained'>Forgot password</Button>
                    </span>
                </CardContent>
            </Card>
        </div>
    )
}