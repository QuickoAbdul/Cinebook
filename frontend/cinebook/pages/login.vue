<template>
    <div class="login-page">
        <h1>Login</h1>
        <form @submit.prevent="handleLogin">
            <div>
                <label for="email">Email:</label>
                <input type="email" v-model="email" required />
            </div>
            <div>
                <label for="password">Password:</label>
                <input type="password" v-model="password" required />
            </div>
            <button type="submit">Login</button>
        </form>
        <div v-if="messageerror" class="error">{{ messageerror }}</div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const messageerror = ref('')

const handleLogin = async () => {
    try {
        const { data, error, response } = await useFetch('http://localhost:3001/login', {
            method: 'POST',
            body: { identifier: email.value, password: password.value },
            // Ajout d'un traitement pour les erreurs
            onResponse: ({ response }) => {
                console.log('Réponse reçue:', response._data.success);
                if (response._data.success == true) {
                    messageerror.value = 'Login successful';
                } else {
                    messageerror.value = 'Identifiant ou mot de passe incorrect.';
                }
            }
        })
    } catch (err) {
        // Gestion des erreurs imprévues (ex : problème réseau)
        messageerror.value = 'Une erreur inattendue est survenue.'
        console.error('Erreur lors de la connexion:', err)
    }
}
</script>

<style scoped>
.login-page {
    max-width: 400px;
    margin: 0 auto;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.error {
    color: red;
    margin-top: 1rem;
}
</style>