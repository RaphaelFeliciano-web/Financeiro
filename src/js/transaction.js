function createTransactionManager(DOM) {
    const State = {
        transactions: JSON.parse(localStorage.getItem('transactions')) || [],
        editingId: null,
        isConfirmationVisible: false,
        currentFilter: 'all',
        showingAll: false, // Controla se todas as transações são exibidas
        filterSummaryRequested: false, // Controla a visibilidade do resumo do filtro
        charts: { despesas: null, receitas: null, saldoEvolucao: null, goals: null, investments: null, investmentAllocation: null }, // Armazena instâncias dos gráficos
        budgets: JSON.parse(localStorage.getItem('budgets')) || {}, // Novo estado para orçamentos
        transactionCategories: JSON.parse(localStorage.getItem('transactionCategories')) || ['Salário', 'Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Pagamento de Fatura', 'Outros'],
        mainGoal: JSON.parse(localStorage.getItem('mainGoal')) || { name: 'Meta de Economia Mensal', target: 0, saved: 0 },
        investmentCategories: JSON.parse(localStorage.getItem('investmentCategories')) || ['Renda Fixa', 'Renda Variável', 'Fundos Imobiliários', 'Criptomoedas'],
        customGoals: JSON.parse(localStorage.getItem('customGoals')) || [],
        editingGoalId: null, // Novo estado para controlar a edição de metas
        goalActionTargetId: null, // ID da meta para adicionar fundos ou excluir
        valuesVisible: true, // Novo estado para controlar a visibilidade dos valores
        goalCreationType: 'meta', // Controla o tipo de meta/investimento a ser criado
        draggedItemId: null, // Armazena o ID do item sendo arrastado
        categoryColors: {}, // Armazena as cores geradas para cada categoria
    };

    /**
     * Salva as transações no Local Storage, garantindo a persistência dos dados.
     */
    const saveToLocalStorage = () => {
        localStorage.setItem('transactions', JSON.stringify(State.transactions));
    };

    /**
     * Salva as categorias de transação no Local Storage.
     */
    const saveTransactionCategoriesToLocalStorage = () => {
        localStorage.setItem('transactionCategories', JSON.stringify(State.transactionCategories));
    };

    /**
     * Salva as categorias de investimento no Local Storage.
     */
    const saveInvestmentCategoriesToLocalStorage = () => {
        localStorage.setItem('investmentCategories', JSON.stringify(State.investmentCategories));
    };

    /**
     * Salva os orçamentos no Local Storage.
     */
    const saveBudgetsToLocalStorage = () => {
        localStorage.setItem('budgets', JSON.stringify(State.budgets));
    };

    /**
     * Salva as metas personalizadas no Local Storage.
     */
    const saveCustomGoalsToLocalStorage = () => {
        localStorage.setItem('customGoals', JSON.stringify(State.customGoals));
    };

    /**
     * Salva a meta principal no Local Storage.
     */
    const saveMainGoalToLocalStorage = () => {
        localStorage.setItem('mainGoal', JSON.stringify(State.mainGoal));
    };

    /**
     * Gera uma cor consistente com base no nome da categoria.
     * @param {string} categoryName - O nome da categoria.
     * @returns {string} - Uma cor HSL.
     */
    const getCategoryColor = (categoryName) => {
        if (State.categoryColors[categoryName]) {
            return State.categoryColors[categoryName];
        }

        // Gera um hash simples a partir do nome da categoria
        let hash = 0;
        for (let i = 0; i < categoryName.length; i++) {
            hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash; // Converte para 32bit integer
        }

        // Usa o hash para gerar uma cor HSL bonita e consistente
        const hue = hash % 360;
        const saturation = 70; // Saturação consistente
        const lightness = 40;  // Luminosidade consistente

        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        State.categoryColors[categoryName] = color;
        return color;
    };

    /**
     * Formata um número para a moeda BRL.
     */
    const formatCurrency = (value) => {
        if (!State.valuesVisible) {
            return 'R$ •••••';
        }
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    /**
     * Formata uma data para o formato local.
     */
    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    };

    /**
     * Mostra uma notificação (toast).
     */
    const showNotification = (message, type = 'success', duration = 4000) => {
        if (!DOM.notificationContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '✓', error: '✖', info: 'ℹ️' };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons['info']}</span>
            <p class="toast-message">${message}</p>
            <button class="toast-close">&times;</button>
            <div class="toast-progress"></div>
        `;
        const progressBar = toast.querySelector('.toast-progress');
        progressBar.style.animationDuration = `${duration / 1000}s`;
        const removeToast = () => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        };
        toast.querySelector('.toast-close').addEventListener('click', removeToast);
        DOM.notificationContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(removeToast, duration);
    };

    /**
     * Mostra um modal de confirmação.
     */
    const showConfirmation = (message) => {
        if (State.isConfirmationVisible) {
            return Promise.resolve(false);
        }
        State.isConfirmationVisible = true;

        if (!DOM.confirmationModal) {
            State.isConfirmationVisible = false;
            return Promise.resolve(window.confirm(message));
        }
        return new Promise((resolve) => {
            DOM.confirmationMessage.textContent = message;
            DOM.confirmationModal.classList.remove('hidden');
            DOM.confirmBtnCancel.focus();
            const close = (result) => {
                State.isConfirmationVisible = false;
                DOM.confirmationModal.classList.add('hidden');
                cleanup();
                resolve(result);
            };
            const handleConfirm = () => close(true);
            const handleCancel = () => close(false);
            const handleKeydown = (e) => {
                if (e.key === 'Escape') handleCancel();
            };
            const cleanup = () => {
                DOM.confirmBtnOk.removeEventListener('click', handleConfirm);
                DOM.confirmBtnCancel.removeEventListener('click', handleCancel);
                document.removeEventListener('keydown', handleKeydown);
            };
            DOM.confirmBtnOk.addEventListener('click', handleConfirm);
            DOM.confirmBtnCancel.addEventListener('click', handleCancel);
            document.addEventListener('keydown', handleKeydown);
        });
    };

    /**
     * Retorna uma mensagem de status financeiro com base no saldo.
     */
    const getFinancialHealthStatus = (metrics) => {
        const { receitas, saldoFinal } = metrics;

        if (receitas === 0) {
            return saldoFinal < 0
                ? '<span>Atenção, você só teve despesas neste período. 🤔</span>'
                : '<span>Nenhuma movimentação para analisar. Que tal começar?</span>';
        }

        const balanceToIncomeRatio = saldoFinal / receitas;

        if (balanceToIncomeRatio > 0.5) { // Manteve mais de 50% da renda na conta
            return '<span class="receita">Excelente! Seu saldo em conta é mais da metade da sua renda. 🚀</span>';
        } else if (balanceToIncomeRatio > 0.2) { // Manteve mais de 20%
            return '<span class="positivo">Muito bom! Você está mantendo um saldo saudável em conta. 👍</span>';
        } else if (balanceToIncomeRatio > 0) { // Manteve algo, mas pouco
            return '<span>Seu saldo está positivo, mas com uma margem pequena. Fique de olho nos gastos. 👀</span>';
        } else {
            return '<span class="despesa">Alerta! Seu saldo em conta está negativo. Vamos revisar o orçamento. 📉</span>';
        }
    };

    /**
     * Renderiza o histórico de transações na tela.
     */
    const renderTransactions = (options = {}) => {
        const { highlightId } = options;
        if (!DOM.transacoesLista) return;
        DOM.transacoesLista.innerHTML = '';

        // Filtra as transações com base no estado atual do filtro
        const filteredTransactions = State.transactions.filter(t => {
            if (State.currentFilter === 'all') return true;
            return t.tipo === State.currentFilter;
        });

        // Limita o número de transações a serem exibidas
        const transactionsToRender = State.showingAll ? filteredTransactions : filteredTransactions.slice(0, 10);

        if (transactionsToRender.length === 0) {
            if (DOM.emptyStateMessage) {
                DOM.emptyStateMessage.style.display = 'block';
                const messageP = DOM.emptyStateMessage.querySelector('p');
                if (messageP) {
                    messageP.textContent = State.currentFilter === 'all'
                        ? 'Nenhuma transação registrada ainda.'
                        : `Nenhuma transação do tipo '${State.currentFilter}' encontrada.`;
                }
            }
            if (DOM.historicoFooter) DOM.historicoFooter.classList.add('hidden');
            return;
        }

        if (DOM.emptyStateMessage) DOM.emptyStateMessage.style.display = 'none';

        // Gerencia a visibilidade do botão "Mostrar Mais"
        if (DOM.historicoFooter) {
            if (filteredTransactions.length > 10 && !State.showingAll) {
                DOM.historicoFooter.classList.remove('hidden');
            } else {
                DOM.historicoFooter.classList.add('hidden');
            }
        }

        transactionsToRender.forEach(transaction => {
            if (!DOM.transacaoTemplate) return;
            const clone = DOM.transacaoTemplate.content.cloneNode(true);
            const li = clone.querySelector('li');
            const deleteBtn = clone.querySelector('.delete-btn');
            const editBtn = clone.querySelector('.edit-btn');

            li.style.setProperty('--category-color', getCategoryColor(transaction.categoria));
            li.classList.add(transaction.tipo);
            li.dataset.id = transaction.id; // Usaremos o ID numérico novamente

            clone.querySelector('.col-data').textContent = formatDateTime(transaction.data);
            clone.querySelector('.col-descricao').textContent = transaction.descricao; // O ID do backend será `_id`
            clone.querySelector('.col-categoria').textContent = transaction.categoria;
            clone.querySelector('.tag-categoria-mobile').textContent = transaction.categoria;
            clone.querySelector('.col-pagamento').textContent = transaction.pagamento;

            const valorPrefix = transaction.tipo === 'receita' ? '+ ' : '- ';
            clone.querySelector('.col-valor').textContent = valorPrefix + formatCurrency(transaction.valor);

            deleteBtn.dataset.id = transaction.id; // Usaremos o ID numérico novamente
            editBtn.dataset.id = transaction.id; // Usaremos o ID numérico novamente

            if (transaction.id === highlightId) {
                li.classList.add('flash');
            }

            DOM.transacoesLista.appendChild(clone);
        });
    };

    /**
     * Calcula as principais métricas financeiras a partir do estado atual das transações.
     */
    const calculateMetrics = () => {
        const incomeByCategory = {};
        const expenseByCategory = {};

        // Adiciona a lógica para identificar o mês atual
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const metrics = State.transactions.reduce((acc, t) => {
            const transactionDate = new Date(t.data);
            const isCurrentMonth = transactionDate.getFullYear() === currentYear && transactionDate.getMonth() === currentMonth;

            if (t.tipo === 'receita') {
                acc.receitas += t.valor;
                if (isCurrentMonth) incomeByCategory[t.categoria] = (incomeByCategory[t.categoria] || 0) + t.valor;
            } else if (t.tipo === 'despesa') {
                acc.totalDespesas += t.valor;
                if (t.pagamento === 'credito') {
                    acc.gastosNoCredito += t.valor;
                } else {
                    acc.despesasEmConta += t.valor; // Inclui débito, pix, etc.
                    if (isCurrentMonth && t.pagamento === 'debito') acc.totalGastoDebito += t.valor;
                    if (isCurrentMonth && t.pagamento === 'pix') acc.totalGastoPix += t.valor;
                }

                // MODIFICAÇÃO PRINCIPAL: Acumula gastos para o orçamento apenas se a transação for do mês atual.
                if (t.categoria !== 'Pagamento de Fatura' && isCurrentMonth) {
                    expenseByCategory[t.categoria] = (expenseByCategory[t.categoria] || 0) + t.valor;
                }
            }

            if (t.categoria === 'Pagamento de Fatura') {
                acc.pagamentosDeFatura += t.valor;
            }
            return acc;
        }, {
            receitas: 0, despesasEmConta: 0, gastosNoCredito: 0, pagamentosDeFatura: 0,
            totalDespesas: 0, totalGastoDebito: 0, totalGastoPix: 0,
        });

        metrics.saldoFinal = metrics.receitas - metrics.despesasEmConta;
        metrics.dividaFinal = metrics.gastosNoCredito - metrics.pagamentosDeFatura;

        // Encontra a maior categoria de despesa
        const expenseCategories = Object.keys(expenseByCategory);
        if (expenseCategories.length > 0) {
            const topCategory = expenseCategories.reduce((a, b) => expenseByCategory[a] > expenseByCategory[b] ? a : b);
            metrics.topExpenseCategory = topCategory;
            metrics.topExpenseValue = expenseByCategory[topCategory];
        } else {
            metrics.topExpenseCategory = 'N/A';
            metrics.topExpenseValue = 0;
        }

        metrics.expenseByCategory = expenseByCategory;
        metrics.incomeByCategory = incomeByCategory;

        // Calcula o fluxo mensal de caixa (receitas vs despesas que afetam a conta)
        const sortedTransactions = [...State.transactions].sort((a, b) => new Date(a.data) - new Date(b.data));
        const monthlyFlow = {};
        sortedTransactions.forEach(t => {
            const date = new Date(t.data);
            // Cria uma chave noformato 'YYYY-MM' para garantir a ordem cronológica
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyFlow[monthKey]) {
                monthlyFlow[monthKey] = { receita: 0, despesa: 0 };
            }
            if (t.tipo === 'receita') {
                monthlyFlow[monthKey].receita += t.valor;
            } else if (t.pagamento !== 'credito') { // Apenas despesas que saem da conta
                monthlyFlow[monthKey].despesa += t.valor;
            }
        });
        metrics.monthlyFlow = monthlyFlow;

        return metrics;
    };

    /**
     * Atualiza os saldos na tela e aplica classes de cor com base nos valores.
     */
    const updateBalance = () => {
        const { saldoFinal, dividaFinal, receitas, totalDespesas } = calculateMetrics();
        if (DOM.saldoAtual) DOM.saldoAtual.textContent = formatCurrency(saldoFinal);
        if (DOM.dividaCartao) DOM.dividaCartao.textContent = formatCurrency(dividaFinal);

        // Atualiza os novos cards de resumo do mês
        if (DOM.receitasMes) {
            DOM.receitasMes.textContent = formatCurrency(receitas);
        }
        if (DOM.despesasMes) {
            DOM.despesasMes.textContent = formatCurrency(totalDespesas);
        }

        [DOM.saldoAtual, DOM.dividaCartao].forEach(el => {
            if (!el) return;
            const card = el.closest('.card-balanco');
            if (!card) return;

            card.classList.remove('positivo', 'negativo', 'neutro');
            const value = (el.id === 'dividaCartao') ? -dividaFinal : saldoFinal;

            if (value > 0) {
                card.classList.add('positivo');
            } else if (value < 0) {
                card.classList.add('negativo');
            } else {
                card.classList.add('neutro');
            }
        });
    };

    /**
     * Remove uma transação pelo ID.
     */
    const deleteTransaction = async (id) => { // Mantemos async por causa do showConfirmation
        const confirmed = await showConfirmation('Tem certeza que deseja remover esta transação?');
        if (confirmed) {
            State.transactions = State.transactions.filter(t => t.id !== id);
            saveToLocalStorage();
            updateDOM();
            showNotification('Transação removida.', 'success');
        }
    };

    /**
     * Limpa todas as transações.
     */
    const clearAllTransactions = async () => { // Mantemos async por causa do showConfirmation
        if (State.transactions.length === 0) {
            showNotification('Não há transações para limpar.', 'error');
            return;
        }
        const confirmed = await showConfirmation('ATENÇÃO: Isso removerá TODAS as transações. Deseja continuar?');
        if (confirmed) {
            State.transactions = [];
            saveToLocalStorage();
            updateDOM();
            showNotification('Todas as transações foram removidas.', 'success');
        }
    };

    /**
     * Cria uma transação de pagamento de fatura a partir do modal dedicado.
     */
    const payCreditCardBill = () => {
        const valor = parseFloat(DOM.valorFaturaInput.value.replace(',', '.'));

        if (isNaN(valor) || valor <= 0) {
            showNotification('Por favor, insira um valor de pagamento válido.', 'error');
            return;
        }

        // Valida se há saldo suficiente para o pagamento
        const { saldoFinal } = calculateMetrics();
        if (saldoFinal < valor) {
            showNotification('Saldo insuficiente para pagar este valor da fatura.', 'error');
            return;
        }

        const newTransaction = {
            id: Date.now(),
            descricao: 'Pagamento da Fatura do Cartão',
            valor: valor,
            categoria: 'Pagamento de Fatura',
            tipo: 'despesa', // Pagamento de fatura é sempre uma despesa da conta
            pagamento: 'debito', // Sai do saldo da conta
            data: new Date().toISOString()
        };

        const transactionIdToHighlight = newTransaction.id;
        State.transactions.unshift(newTransaction);
        showNotification('Pagamento de fatura registrado com sucesso!', 'success');

        saveToLocalStorage();
        updateDOM({ highlightId: transactionIdToHighlight });

        if (DOM.payBillModal) DOM.payBillModal.classList.add('hidden');
        if (DOM.valorFaturaInput) DOM.valorFaturaInput.value = '';
    };

    /**
     * Exporta as transações para um arquivo HTML com um resumo financeiro e layout apresentável.
     */
    const exportTransactionsToHTML = () => {
        if (State.transactions.length === 0) {
            showNotification('Não há transações para exportar.', 'info');
            return;
        }

        // --- 1. Cálculos do Resumo Financeiro ---
        const { saldoFinal, totalDespesas, totalGastoDebito, gastosNoCredito, totalGastoPix } = calculateMetrics();

        // --- 2. Estilos CSS para o Relatório ---
        const styles = `
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                thead { background-color: #f4f7fa; font-weight: bold; }
                tbody tr:nth-child(even) { background-color: #f9f9f9; }
                .receita { color: #28a745; font-weight: bold; }
                .despesa { color: #dc3545; font-weight: bold; }
                h1, h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                .summary { background-color: #f9f9f9; border: 1px solid #eee; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
                .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
                .summary-item { background-color: #fff; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                .summary-item h3 { margin: 0 0 5px 0; font-size: 1rem; color: #555; }
                .summary-item p { margin: 0; font-size: 1.5rem; font-weight: bold; }
                .saldo-total { color: #007bff; }
            </style>
        `;

        // --- 3. HTML do Resumo Financeiro ---
        const summaryHTML = `
            <div class="summary">
                <h2>Resumo Financeiro</h2>
                <div class="summary-grid">
                    <div class="summary-item">
                        <h3>Saldo Total em Conta</h3>
                        <p class="saldo-total">${formatCurrency(saldoFinal)}</p>
                    </div>
                    <div class="summary-item">
                        <h3>Total de Despesas</h3>
                        <p>${formatCurrency(totalDespesas)}</p>
                    </div>
                    <div class="summary-item">
                        <h3>Gasto no Débito</h3>
                        <p>${formatCurrency(totalGastoDebito)}</p>
                    </div>
                    <div class="summary-item">
                        <h3>Gasto no Crédito</h3>
                        <p>${formatCurrency(gastosNoCredito)}</p>
                    </div>
                    <div class="summary-item">
                        <h3>Gasto no Pix</h3>
                        <p>${formatCurrency(totalGastoPix)}</p>
                    </div>
                </div>
            </div>
        `;

        // --- 4. HTML da Tabela de Transações ---
        const transactionRows = State.transactions.map(t => {
            const valorClass = t.tipo === 'receita' ? 'receita' : 'despesa';
            const valorPrefix = t.tipo === 'receita' ? '+' : '-';
            return `
            <tr>
                <td>${formatDateTime(t.data)}</td>
                <td>${t.descricao}</td>
                <td>${t.categoria}</td>
                <td class="${valorClass}">${valorPrefix} ${formatCurrency(t.valor)}</td>
                <td>${t.pagamento}</td>
            </tr>
        `}).join('');

        // --- 5. Montagem do Documento HTML Final ---
        const finalHtmlContent = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Transações</title>
                ${styles}
            </head>
            <body>
                <h1>Relatório de Transações</h1>
                <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                ${summaryHTML}
                <h2>Histórico Detalhado</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Valor</th>
                            <th>Pagamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactionRows}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        // --- 6. Lógica de Download ---
        const blob = new Blob([finalHtmlContent], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        showNotification('Relatório HTML gerado com sucesso!', 'success');
    };

    /**
     * Exporta as transações para um arquivo CSV, que pode ser aberto e editado em planilhas.
     */
    const exportTransactionsToCSV = () => {
        if (State.transactions.length === 0) {
            showNotification('Não há transações para exportar.', 'info');
            return;
        }

        // Gera um arquivo HTML com a extensão .xls, que o Excel abre com estilos.
        const styles = `
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #1a1a2e; /* Fundo escuro */
                    color: #e0e0e0; /* Texto claro */
                    padding: 20px;
                }
                table { 
                    border-collapse: collapse; 
                    width: 100%; 
                    margin-bottom: 20px; 
                    background-color: #162447; /* Fundo da tabela */
                }
                th, td { 
                    border: 1px solid #334; /* Bordas escuras */
                    text-align: left; 
                    padding: 12px; 
                    vertical-align: middle; 
                }
                tbody tr:nth-child(even) { 
                    background-color: #20315a; /* Zebrado mais claro */
                }
                .header-row { 
                    background-color: #5a9ee2; /* Azul primário do tema escuro */
                    color: #ffffff; 
                    font-weight: bold; 
                    font-size: 1.1em;
                }
                .summary-title { 
                    font-size: 1.5em; 
                    font-weight: 600; 
                    text-align: center; 
                    padding: 15px;
                    border-bottom: 1px solid #334;
                }
                .summary-label { font-weight: 500; }
                .health-status { text-align:center; padding: 15px; font-size: 1.1em; font-style: italic; background-color: #20315a; }
                .receita { color: #50e3c2; font-weight: bold; } /* Verde do tema escuro */
                .despesa { color: #e35050; font-weight: bold; } /* Vermelho do tema escuro */
                .positivo { color: #5a9ee2; font-weight: bold; } /* Azul do tema escuro */
                h2 {
                    font-size: 1.4em;
                    font-weight: 600;
                    color: #e0e0e0;
                    margin-top: 30px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #5a9ee2;
                }
                tfoot .total-row {
                    font-weight: bold;
                    background-color: #162447;
                    border-top: 2px solid #5a9ee2;
                }
                tfoot .total-row td {
                    font-size: 1.1em;
                    padding-top: 12px;
                    padding-bottom: 12px;
                }
            </style>
        `;

        const metrics = calculateMetrics();
        const { saldoFinal, dividaFinal, receitas, totalDespesas, topExpenseCategory, topExpenseValue, expenseByCategory } = metrics;
        const healthStatus = getFinancialHealthStatus(metrics);

        const summaryRows = `
            <tr><td colspan="2" class="summary-title">Seu Raio-X Financeiro 💡</td></tr>
            <tr><td colspan="2" class="health-status">${healthStatus}</td></tr>
            <tr><td class="summary-label">✅ Total de Receitas</td><td class="receita">${formatCurrency(receitas)}</td></tr>
            <tr><td class="summary-label">❌ Total de Despesas</td><td class="despesa">${formatCurrency(totalDespesas)}</td></tr>
            <tr><td class="summary-label">💰 Saldo Final em Conta</td><td>${formatCurrency(saldoFinal)}</td></tr>
            <tr><td class="summary-label">💳 Dívida Final do Cartão</td><td>${formatCurrency(dividaFinal)}</td></tr>
            <tr><td class="summary-label">💸 Seu Maior Gasto foi com</td><td>${topExpenseCategory} (${formatCurrency(topExpenseValue)})</td></tr>
        `;

        const transactionHeader = `
            <tr class="header-row">
                <th>🗓️ Data</th>
                <th>📝 Descrição</th>
                <th>🏷️ Categoria</th>
                <th>💰 Entradas</th>
                <th>💸 Saídas</th>
                <th>💳 Forma de Pagamento</th>
            </tr>
        `;

        const transactionRows = State.transactions.map(t => {
            const entrada = t.tipo === 'receita' ? formatCurrency(t.valor) : '';
            const saida = t.tipo === 'despesa' ? formatCurrency(t.valor) : '';

            return `
                <tr>
                    <td>${formatDateTime(t.data)}</td>
                    <td>${t.descricao}</td>
                    <td>${t.categoria}</td>
                    <td class="receita">${entrada}</td>
                    <td class="despesa">${saida}</td>
                    <td>${t.pagamento}</td>
                </tr>
            `;
        }).join('\n');

        const totalRow = `
            <tfoot>
                <tr class="total-row">
                    <td colspan="3" style="text-align: right;">TOTAIS</td>
                    <td class="receita">${formatCurrency(receitas)}</td>
                    <td class="despesa">${formatCurrency(totalDespesas)}</td>
                    <td></td>
                </tr>
            </tfoot>
        `;

        // Cria a tabela de resumo de despesas por categoria
        const sortedCategories = Object.entries(expenseByCategory || {}).sort(([, a], [, b]) => b - a);
        const categorySummaryRows = sortedCategories.length > 0
            ? sortedCategories.map(([category, value]) => `
                <tr>
                    <td>${category}</td>
                    <td class="despesa">${formatCurrency(value)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="2">Nenhuma despesa para resumir.</td></tr>';

        const categorySummaryTable = `
            <h2>Resumo de Despesas por Categoria</h2>
            <table>
                <thead><tr class="header-row"><th>📂 Categoria</th><th>💸 Total Gasto</th></tr></thead>
                <tbody>${categorySummaryRows}</tbody>
            </table>
        `;

        const finalHtmlContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8">${styles}</head>
            <body>
                <table><tbody>${summaryRows}</tbody></table>
                <table><thead>${transactionHeader}</thead><tbody>${transactionRows}</tbody>${totalRow}</table>
                ${categorySummaryTable}
            </body>
            </html>
        `;

        const blob = new Blob([finalHtmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        showNotification('Seu relatório financeiro está pronto! ✨', 'success');
    };

    /**
     * Configura o estado para mostrar todas as transações e atualiza a DOM.
     */
    const showAllTransactions = () => {
        State.showingAll = true;
        updateDOM();
    };

    /**
     * Define o filtro a ser aplicado na lista de transações e atualiza a exibição.
     * @param {string} filter - O tipo de filtro ('all', 'receita', 'despesa').
     */
    const setFilter = (filter) => {
        State.currentFilter = filter;
        State.filterSummaryRequested = true; // Ativa a exibição do resumo
        State.showingAll = false; // Reseta a visualização ao trocar de filtro
        updateDOM();
    };

    /**
     * Renderiza um resumo contextual com base no filtro ativo.
     */
    const renderFilterSummary = () => {
        if (!DOM.filtroResumo) return;

        // Só mostra o resumo se o usuário já interagiu com os filtros
        if (!State.filterSummaryRequested) {
            DOM.filtroResumo.innerHTML = '';
            DOM.filtroResumo.classList.add('hidden');
            return;
        }

        const metrics = calculateMetrics();
        let summaryHTML = '';

        if (State.currentFilter === 'all' && State.transactions.length > 0) {
            summaryHTML = `
                <div class="resumo-grid">
                    <div class="resumo-item">
                        <h4>Gasto no Crédito</h4>
                        <p class="despesa">${formatCurrency(metrics.gastosNoCredito)}</p>
                    </div>
                    <div class="resumo-item">
                        <h4>Gasto no Débito</h4>
                        <p class="despesa">${formatCurrency(metrics.totalGastoDebito)}</p>
                    </div>
                    <div class="resumo-item">
                        <h4>Gasto no Pix</h4>
                        <p class="despesa">${formatCurrency(metrics.totalGastoPix)}</p>
                    </div>
                </div>
            `;
        } else if (State.currentFilter === 'receita' && metrics.receitas > 0) {
            summaryHTML = `
                <div class="resumo-grid">
                    <div class="resumo-item">
                        <h4>Total de Receitas</h4>
                        <p class="receita">${formatCurrency(metrics.receitas)}</p>
                    </div>
                </div>
            `;
        } else if (State.currentFilter === 'despesa' && metrics.totalDespesas > 0) {
            const sortedCategories = Object.entries(metrics.expenseByCategory || {}).sort(([, a], [, b]) => b - a);
            if (sortedCategories.length > 0) {
                summaryHTML = '<div class="resumo-grid">';
                sortedCategories.forEach(([category, value]) => {
                    summaryHTML += `
                        <div class="resumo-item">
                            <h4>${category}</h4>
                            <p class="despesa">${formatCurrency(value)}</p>
                        </div>
                    `;
                });
                summaryHTML += '</div>';
            }
        }

        if (summaryHTML) {
            DOM.filtroResumo.innerHTML = summaryHTML;
            DOM.filtroResumo.classList.remove('hidden');
        } else {
            DOM.filtroResumo.innerHTML = '';
            DOM.filtroResumo.classList.add('hidden');
        }
    };

    /**
     * Lida com cliques fora do resumo do filtro para escondê-lo.
     */
    const handleClickOutside = (e) => {
        if (!State.filterSummaryRequested || !DOM.filtroResumo || DOM.filtroResumo.classList.contains('hidden')) {
            return;
        }

        // Verifica se o clique foi dentro do resumo ou dos botões de filtro
        const isClickInsideSummary = DOM.filtroResumo.contains(e.target);
        const isClickInsideFilters = DOM.filterButtonsContainer && DOM.filterButtonsContainer.contains(e.target);

        // Se o clique foi fora de ambos, esconde o resumo
        if (!isClickInsideSummary && !isClickInsideFilters) {
            State.filterSummaryRequested = false;
            renderFilterSummary();
        }
    };

    const renderAnalysisSummary = (metrics) => {
        if (!DOM.analiseResumo) return;
    
        const { receitas, totalDespesas } = metrics;
        const netBalance = receitas - totalDespesas;
        const healthStatus = getFinancialHealthStatus(metrics);
    
        const icons = {
            receitas: `<svg class="card-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l4-4 4 4h-3v4h-2z" fill="currentColor"/></svg>`,
            despesas: `<svg class="card-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" fill="currentColor"/></svg>`,
            balanco: `<svg class="card-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="currentColor"/></svg>`,
            saude: `<svg class="card-icon" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>`
        };

        const summaryHTML = `
            <div class="analise-resumo-item">
                <div class="resumo-item-header">
                    ${icons.receitas}<h4>Total de Receitas</h4>
                </div>
                <p class="receita">${formatCurrency(receitas)}</p>
            </div>
            <div class="analise-resumo-item">
                <div class="resumo-item-header">
                    ${icons.despesas}<h4>Total de Despesas</h4>
                </div>
                <p class="despesa">${formatCurrency(totalDespesas)}</p>
            </div>
            <div class="analise-resumo-item">
                <div class="resumo-item-header">
                    ${icons.balanco}<h4>Balanço do Período</h4>
                </div>
                <p class="${netBalance >= 0 ? 'receita' : 'despesa'}">${formatCurrency(netBalance)}</p>
            </div>
            <div class="analise-resumo-item health-status-card">
                <div class="resumo-item-header">
                    ${icons.saude}<h4>Sua Saúde Financeira</h4>
                </div>
                <p>${healthStatus}</p>
            </div>
        `;
    
        DOM.analiseResumo.innerHTML = summaryHTML;
    };

    const chartColors = {
        expense: ['#e35050', '#f5a623', '#4a90e2', '#bd10e0', '#7ed321', '#4a4a4a', '#9013fe', '#f8e71c', '#d0021b', '#b8e986'],
        income: ['#50e3c2', '#4a90e2', '#7ed321', '#f8e71c', '#9013fe', '#2d7c6c', '#2e5c8a', '#589a1a', '#bfae15', '#670da5']
    };

    const renderExpenseChart = (metrics, chartFontColor) => {
        const { expenseByCategory } = metrics;
        const hasData = expenseByCategory && Object.keys(expenseByCategory).length > 0;

        DOM.despesasChartContainer.classList.toggle('hidden', !hasData);
        DOM.despesasChartEmpty.classList.toggle('hidden', hasData);

        if (State.charts.despesas) State.charts.despesas.destroy();

        if (hasData) {
            const categoryLabels = Object.keys(expenseByCategory);
            const categoryData = Object.values(expenseByCategory);
            const totalExpensesForChart = categoryData.reduce((sum, val) => sum + val, 0);

            const despesasCtx = DOM.despesasChart.getContext('2d');
            State.charts.despesas = new Chart(despesasCtx, {
                type: 'doughnut',
                data: {
                    labels: categoryLabels,
                    datasets: [{
                        data: categoryData,
                        backgroundColor: chartColors.expense,
                        borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#162447' : '#fff',
                        borderWidth: 2,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const percentage = ((value / totalExpensesForChart) * 100).toFixed(1);
                                    return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

            const sortedExpenses = Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a);
            let listHTML = '';
            sortedExpenses.forEach(([category, value], index) => {
                const color = chartColors.expense[index % chartColors.expense.length];
                const percentage = (value / totalExpensesForChart) * 100;
                listHTML += /*html*/`
                    <div class="lista-detalhada-item">
                        <div class="lista-detalhada-progress" style="width: ${percentage}%; background-color: ${color};"></div>
                        <div class="lista-detalhada-content">
                            <span class="lista-detalhada-categoria">${category}</span>
                            <span class="lista-detalhada-valor">${formatCurrency(value)}</span>
                        </div>
                    </div>
                `;
            });
            DOM.despesasListaDetalhada.innerHTML = listHTML;
        }
    };

    const renderIncomeChart = (metrics, chartFontColor) => {
        const { incomeByCategory } = metrics;
        const hasData = incomeByCategory && Object.keys(incomeByCategory).length > 0;

        DOM.receitasChartContainer.classList.toggle('hidden', !hasData);
        DOM.receitasChartEmpty.classList.toggle('hidden', hasData);

        if (State.charts.receitas) State.charts.receitas.destroy();

        if (hasData) {
            const incomeLabels = Object.keys(incomeByCategory);
            const incomeData = Object.values(incomeByCategory);
            const totalIncomeForChart = incomeData.reduce((sum, val) => sum + val, 0);

            const receitasCtx = DOM.receitasChart.getContext('2d');
            State.charts.receitas = new Chart(receitasCtx, {
                type: 'doughnut',
                data: {
                    labels: incomeLabels,
                    datasets: [{
                        data: incomeData,
                        backgroundColor: chartColors.income,
                        borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#162447' : '#fff',
                        borderWidth: 2,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const percentage = ((value / totalIncomeForChart) * 100).toFixed(1);
                                    return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

            const sortedIncomes = Object.entries(incomeByCategory).sort(([, a], [, b]) => b - a);
            let listHTML = '';
            sortedIncomes.forEach(([category, value], index) => {
                const color = chartColors.income[index % chartColors.income.length];
                const percentage = (value / totalIncomeForChart) * 100;
                listHTML += /*html*/`
                    <div class="lista-detalhada-item receita">
                        <div class="lista-detalhada-progress" style="width: ${percentage}%; background-color: ${color};"></div>
                        <div class="lista-detalhada-content">
                            <span class="lista-detalhada-categoria">${category}</span>
                            <span class="lista-detalhada-valor">${formatCurrency(value)}</span>
                        </div>
                    </div>
                `;
            });
            DOM.receitasListaDetalhada.innerHTML = listHTML;
        }
    };

    const renderBalanceChart = (metrics, chartFontColor) => {
        const { monthlyFlow } = metrics;
        const hasData = monthlyFlow && Object.keys(monthlyFlow).length > 0;

        DOM.saldoEvolucaoChartContainer.classList.toggle('hidden', !hasData);
        DOM.saldoChartEmpty.classList.toggle('hidden', hasData);

        if (State.charts.saldoEvolucao) State.charts.saldoEvolucao.destroy();

        if (hasData) {
            const monthKeys = Object.keys(monthlyFlow);
            
            const labels = monthKeys.map(key => {
                const [year, month] = key.split('-');
                return new Date(year, month - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
            });

            const incomeData = monthKeys.map(month => monthlyFlow[month].receita);
            const expenseData = monthKeys.map(month => monthlyFlow[month].despesa);

            const saldoCtx = DOM.saldoEvolucaoChart.getContext('2d');
            State.charts.saldoEvolucao = new Chart(saldoCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Receitas',
                        data: incomeData,
                        backgroundColor: 'rgba(80, 227, 194, 0.7)',
                        borderColor: '#50e3c2',
                        borderWidth: 1
                    }, {
                        label: 'Despesas',
                        data: expenseData,
                        backgroundColor: 'rgba(227, 80, 80, 0.7)',
                        borderColor: '#e35050',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: { color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#334' : '#e0e0e0' }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#334' : '#e0e0e0' }
                        }
                    },
                    plugins: {
                        legend: { display: true, position: 'top' },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    };

    /**
     * Renderiza os gráficos de análise financeira.
     */
    const renderCharts = () => {
        const metrics = calculateMetrics();
        const chartFontColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#e0e0e0' : '#333';
        Chart.defaults.color = chartFontColor;

        // Gráficos da aba "Análise"
        renderAnalysisSummary(metrics);
        renderExpenseChart(metrics, chartFontColor);
        renderIncomeChart(metrics, chartFontColor);
        renderBalanceChart(metrics, chartFontColor);

        // Gráficos das abas "Metas" e "Investimentos"
        renderGoalsChart(chartFontColor);
        renderInvestmentsChart(chartFontColor);
        renderInvestmentAllocationChart(chartFontColor);
    };

    /**
     * Prepara os dados para o gráfico de metas.
     */
    const getGoalChartData = () => {
        const goals = State.customGoals.filter(g => g.type === 'meta' || !g.type); // Inclui metas personalizadas
        const mainGoal = State.mainGoal;

        const allGoals = [];
        if (mainGoal.target > 0) {
            allGoals.push({ name: mainGoal.name, saved: mainGoal.saved, target: mainGoal.target });
        }
        allGoals.push(...goals);

        const labels = allGoals.map(g => g.name);
        const savedData = allGoals.map(g => g.saved);
        const targetData = allGoals.map(g => Math.max(0, g.target - g.saved)); // Remaining to reach target

        return { labels, savedData, targetData, hasData: allGoals.length > 0 };
    };

    /**
     * Prepara os dados para o gráfico de investimentos.
     */
    const getInvestmentChartData = () => {
        const investments = State.customGoals.filter(g => g.type === 'investimento');
        
        const labels = investments.map(g => g.name);
        const investedData = investments.map(g => g.saved);
        const targetData = investments.map(g => Math.max(0, g.target - g.saved)); // Remaining to reach target

        return { labels, investedData, targetData, hasData: investments.length > 0 };
    };

    /**
     * Renderiza o gráfico de progresso das metas.
     */
    const renderGoalsChart = (chartFontColor) => {
        if (!DOM.goalsChart) return;

        const { labels, savedData, targetData, hasData } = getGoalChartData();

        DOM.goalsChartContainer.classList.toggle('hidden', !hasData);
        DOM.goalsChartEmpty.classList.toggle('hidden', hasData);

        if (State.charts.goals) State.charts.goals.destroy();

        if (hasData) {
            const goalsCtx = DOM.goalsChart.getContext('2d');
            State.charts.goals = new Chart(goalsCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Economizado',
                            data: savedData,
                            backgroundColor: 'rgba(80, 227, 194, 0.7)', // Cor de sucesso
                            borderColor: '#50e3c2',
                            borderWidth: 1
                        },
                        {
                            label: 'Falta Economizar',
                            data: targetData,
                            backgroundColor: 'rgba(74, 144, 226, 0.7)', // Cor primária
                            borderColor: '#4a90e2',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    indexAxis: 'y', // Barras horizontais
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true,
                            beginAtZero: true,
                            grid: { color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#334' : '#e0e0e0' },
                            ticks: { callback: (value) => formatCurrency(value) }
                        },
                        y: {
                            stacked: true,
                            grid: { color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#334' : '#e0e0e0' }
                        }
                    },
                    plugins: {
                        legend: { display: true, position: 'top' },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: { label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}` }
                        }
                    }
                }
            });
        }
    };

    /**
     * Renderiza o gráfico de progresso dos investimentos.
     */
    const renderInvestmentsChart = (chartFontColor) => {
        if (!DOM.investmentsChart) return;

        const { labels, investedData, targetData, hasData } = getInvestmentChartData();

        DOM.investmentsChartContainer.classList.toggle('hidden', !hasData);
        DOM.investmentsChartEmpty.classList.toggle('hidden', hasData);

        if (State.charts.investments) State.charts.investments.destroy();

        if (hasData) {
            const investmentsCtx = DOM.investmentsChart.getContext('2d');
            State.charts.investments = new Chart(investmentsCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Investido',
                            data: investedData,
                            backgroundColor: 'rgba(74, 144, 226, 0.7)', // Cor primária
                            borderColor: '#4a90e2',
                            borderWidth: 1
                        },
                        {
                            label: 'Falta Investir',
                            data: targetData,
                            backgroundColor: 'rgba(245, 166, 35, 0.7)', // Cor de aviso
                            borderColor: '#f5a623',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true,
                            beginAtZero: true,
                            grid: { color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#334' : '#e0e0e0' },
                            ticks: { callback: (value) => formatCurrency(value) }
                        },
                        y: {
                            stacked: true,
                            grid: { color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#334' : '#e0e0e0' }
                        }
                    },
                    plugins: {
                        legend: { display: true, position: 'top' },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: { label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}` }
                        }
                    }
                }
            });
        }
    };

    /**
     * Renderiza o gráfico de alocação de investimentos (doughnut).
     */
    const renderInvestmentAllocationChart = (chartFontColor) => {
        if (!DOM.investmentAllocationChart) return;

        const investments = State.customGoals.filter(g => g.type === 'investimento' && g.saved > 0);
        const hasData = investments.length > 0;

        DOM.investmentAllocationChartContainer.classList.toggle('hidden', !hasData);
        DOM.investmentAllocationChartEmpty.classList.toggle('hidden', hasData);

        if (State.charts.investmentAllocation) State.charts.investmentAllocation.destroy();

        if (hasData) {
            // Agrupa os investimentos por categoria
            const allocationByCategory = investments.reduce((acc, investment) => {
                const category = investment.category || 'Sem Categoria'; // Fallback para dados antigos
                acc[category] = (acc[category] || 0) + investment.saved;
                return acc;
            }, {});

            const labels = Object.keys(allocationByCategory);
            const data = Object.values(allocationByCategory);
            const totalInvested = investments.reduce((sum, i) => sum + i.saved, 0);

            const allocationCtx = DOM.investmentAllocationChart.getContext('2d');
            State.charts.investmentAllocation = new Chart(allocationCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: chartColors.income,
                        borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#162447' : '#fff',
                        borderWidth: 2,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const percentage = ((value / totalInvested) * 100).toFixed(1);
                                    return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

            const sortedCategories = Object.entries(allocationByCategory).sort(([, a], [, b]) => b - a);
            let listHTML = '';
            sortedCategories.forEach(([category, value], index) => {
                const color = chartColors.income[index % chartColors.income.length];
                const percentage = ((value / totalInvested) * 100).toFixed(1);
                listHTML += /*html*/`
                    <div class="lista-detalhada-item receita">
                        <div class="lista-detalhada-progress" style="width: ${percentage}%; background-color: ${color};"></div>
                        <div class="lista-detalhada-content">
                            <span class="lista-detalhada-categoria">${category}</span>
                            <span class="lista-detalhada-valor">${formatCurrency(value)} (${percentage}%)</span>
                        </div>
                    </div>
                `;
            });
            DOM.investmentAllocationListaDetalhada.innerHTML = listHTML;
        } else {
            DOM.investmentAllocationListaDetalhada.innerHTML = '';
        }
    };

    /**
     * Função genérica para renderizar uma lista de metas em um container específico.
     * @param {HTMLElement} container - O elemento DOM onde as metas serão renderizadas.
     * @param {Array} goals - O array de objetos de meta a serem renderizados.
     */
    const renderGoalsList = (container, goals) => {
        if (!container) return;

        container.innerHTML = ''; // Limpa o container
        if (goals.length === 0) {
            return;
        }

        goals.forEach(goal => {
            const saved = goal.saved || 0;
            const target = goal.target;
            const remaining = Math.max(0, target - saved);            
            const percentage = target > 0 ? (saved / target) * 100 : (saved > 0 ? 100 : 0);
            const typeText = goal.type === 'investimento' ? 'Investimento' : 'Meta';
            const isInvestment = goal.type === 'investimento';
            const isCompleted = percentage >= 100;

            const card = document.createElement('div');
            card.className = 'meta-card';
            card.dataset.id = goal.id;

            if (isInvestment) {
                card.draggable = true;
            }

            const editAction = isInvestment ? 'editar-investimento' : 'editar-meta';
            const addFundsAction = 'adicionar-fundos';

            // Define o ícone com base no tipo e categoria do ativo
            // SVG Icons
            const icons = {
                goal: `<svg class="card-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v4h-2zm0 6h2v2h-2z" fill="currentColor"/></svg>`,
                investment: `<svg class="card-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l4-4 4 4h-3v4h-2z" fill="currentColor"/></svg>`,
                realEstate: `<svg class="card-icon" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" fill="currentColor"/></svg>`,
                crypto: `<svg class="card-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.29 13.71L12 15.41l-2.29 2.3-1.41-1.41L10.59 14l-2.3-2.29 1.41-1.41L12 12.59l2.29-2.3 1.41 1.41L13.41 14l2.3 2.29-1.42 1.42z" fill="currentColor"/></svg>`
            };

            let iconHTML = icons.goal; // Ícone padrão para metas
            if (isInvestment) {
                if (goal.category === 'Fundos Imobiliários') iconHTML = icons.realEstate;
                else if (goal.category === 'Criptomoedas') iconHTML = icons.crypto;
                else iconHTML = icons.investment;
            }

            card.innerHTML = /*html*/`
                <div class="card-header">
                    <h3>${iconHTML} ${goal.name}</h3>
                    <button class="btn-set-goal btn-edit-goal" data-action="${editAction}" title="Editar ${typeText}">Editar</button>
                </div>
                ${isInvestment && goal.category ? 
                    `<div class="meta-category-display" style="background-color: ${getCategoryColor(goal.category)};">${goal.category}</div>` 
                : ''}
                <div class="savings-progress-container">
                    <div class="savings-progress-bar">
                        <div class="savings-progress-fill" style="width: ${Math.min(percentage, 100)}%;"></div>
                    </div>
                    <div class="savings-progress-text">
                        <span>${isCompleted ? 'Total:' : (isInvestment ? 'Investido:' : 'Economizado:')} <span class="saved-amount">${formatCurrency(saved)}</span></span>
                        <span>${isCompleted ? 'Meta Atingida!' : `Faltam: <span class="goal-amount">${formatCurrency(remaining)}</span>`}</span>
                    </div>
                </div>
                <div class="meta-card-footer">
                    <button class="btn-add-to-goal" data-action="${addFundsAction}">+ Adicionar Dinheiro</button>
                </div>
            `;
            container.appendChild(card);

            if (isCompleted) {
                card.classList.add('completed');
            }
        });
    };

    /**
     * Renderiza as opções de categoria de transação no select do formulário.
     */
    const renderTransactionCategoryOptions = () => {
        // Seleciona todos os dropdowns de categoria (pode haver mais de um)
        const categorySelects = document.querySelectorAll('.form-input-categoria');
        if (categorySelects.length === 0) return;

        const optionsHTML = State.transactionCategories
            .map(cat => `<option value="${cat}">${cat}</option>`)
            .join('') + '<option value="Outra">Outra...</option>';

        categorySelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = optionsHTML;
            // Tenta manter o valor selecionado anteriormente, se ainda existir
            select.value = State.transactionCategories.includes(currentValue) ? currentValue : State.transactionCategories[0];
        });
    };

    /**
     * Abre o modal de gerenciamento de categorias e renderiza a lista.
     */
    const openCategoryManager = () => {
        if (!DOM.manageCategoriesModal) return;
        renderCategoryManagerList();
        DOM.manageCategoriesModal.classList.remove('hidden');
        DOM.newCategoryNameInput.focus();
    };

    /**
     * Renderiza a lista de categorias no modal de gerenciamento.
     */
    const renderCategoryManagerList = () => {
        if (!DOM.categoryManagerList) return;
        DOM.categoryManagerList.innerHTML = '';

        const fixedCategories = ['Pagamento de Fatura', 'Salário'];

        State.transactionCategories.forEach(category => {
            const li = document.createElement('li');
            li.className = 'category-manager-item';
            li.dataset.category = category;
            const isFixed = fixedCategories.includes(category);

            li.innerHTML = `
                <span>${category} ${isFixed ? '<small>(fixa)</small>' : ''}</span>
                <div class="actions">
                    ${!isFixed ? `
                        <button class="btn-secondary edit-cat-btn" title="Editar">✏️</button>
                        <button class="btn-perigo delete-cat-btn" title="Excluir">🗑️</button>
                    ` : ''}
                </div>
            `;
            DOM.categoryManagerList.appendChild(li);
        });
    };

    /**
     * Adiciona uma nova categoria a partir do modal de gerenciamento.
     */
    const addNewCategoryFromManager = () => {
        const newCategoryName = DOM.newCategoryNameInput.value.trim();
        if (!newCategoryName) {
            showNotification('O nome da categoria não pode ser vazio.', 'error');
            return;
        }

        const capitalizedCategory = newCategoryName.charAt(0).toUpperCase() + newCategoryName.slice(1);

        if (State.transactionCategories.map(c => c.toLowerCase()).includes(capitalizedCategory.toLowerCase())) {
            showNotification('Essa categoria já existe.', 'error');
            return;
        }

        State.transactionCategories.push(capitalizedCategory);
        saveTransactionCategoriesToLocalStorage();
        showNotification(`Categoria "${capitalizedCategory}" adicionada.`, 'success');

        DOM.newCategoryNameInput.value = '';
        renderCategoryManagerList();
        renderTransactionCategoryOptions();
    };

    /**
     * Lida com cliques nos botões de editar/excluir no modal de categorias.
     */
    const handleCategoryActions = (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const li = target.closest('.category-manager-item');
        const categoryName = li.dataset.category;

        if (target.classList.contains('edit-cat-btn')) {
            editCategory(li, categoryName);
        } else if (target.classList.contains('delete-cat-btn')) {
            deleteCategory(categoryName);
        }
    };

    /**
     * Exclui uma categoria.
     */
    const deleteCategory = async (categoryName) => {
        const confirmed = await showConfirmation(`Tem certeza que deseja excluir a categoria "${categoryName}"?`);
        if (confirmed) {
            State.transactionCategories = State.transactionCategories.filter(c => c !== categoryName);
            saveTransactionCategoriesToLocalStorage();
            showNotification(`Categoria "${categoryName}" excluída.`, 'info');
            renderCategoryManagerList();
            renderTransactionCategoryOptions();
        }
    };

    /**
     * Transforma um item da lista em um formulário de edição.
     */
    const editCategory = (li, oldName) => {
        li.innerHTML = /*html*/`
            <input type="text" class="edit-category-input" value="${oldName}">
            <div class="actions">
                <button class="btn-sucesso save-cat-btn">Salvar</button>
                <button class="btn-secondary cancel-cat-btn">Cancelar</button>
            </div>
        `;
        li.querySelector('.save-cat-btn').onclick = () => saveCategoryEdit(li, oldName);
        li.querySelector('.cancel-cat-btn').onclick = () => renderCategoryManagerList();
    };

    /**
     * Salva a edição de uma categoria.
     */
    const saveCategoryEdit = (li, oldName) => {
        const input = li.querySelector('.edit-category-input');
        const newName = input.value.trim();

        if (!newName) {
            showNotification('O nome da categoria não pode ser vazio.', 'error');
            input.focus();
            return;
        }

        const capitalizedNewName = newName.charAt(0).toUpperCase() + newName.slice(1);

        // Verifica se o novo nome (diferente do antigo) já existe
        if (capitalizedNewName.toLowerCase() !== oldName.toLowerCase() && State.transactionCategories.map(c => c.toLowerCase()).includes(capitalizedNewName.toLowerCase())) {
            showNotification('Essa categoria já existe.', 'error');
            input.focus();
            return;
        }

        // Encontra o índice da categoria antiga e a atualiza
        const categoryIndex = State.transactionCategories.findIndex(c => c === oldName);
        if (categoryIndex > -1) {
            State.transactionCategories[categoryIndex] = capitalizedNewName;
            saveTransactionCategoriesToLocalStorage();
            showNotification(`Categoria "${oldName}" foi renomeada para "${capitalizedNewName}".`, 'success');
        }

        // Re-renderiza a lista e as opções do formulário
        renderCategoryManagerList();
        renderTransactionCategoryOptions();
    };

    /**
     * Renderiza os formulários para definir orçamentos.
     */
    const renderBudgetForms = () => {
        if (!DOM.orcamentoFormContainer) return;
 
        const expenseCategories = [
            "Alimentação", "Transporte", "Moradia", "Lazer", "Saúde", "Outros"
        ];
 
        const categoryIcons = {
            "Alimentação": "🍔",
            "Transporte": "🚗",
            "Moradia": "🏠",
            "Lazer": "🎉",
            "Saúde": "❤️",
            "Outros": "📦"
        };
 
        DOM.orcamentoFormContainer.innerHTML = '';
 
        expenseCategories.forEach(category => {
            const budgetValue = State.budgets[category] || '';
            const icon = categoryIcons[category] || '💰';
            const item = document.createElement('div');
            item.className = 'orcamento-item';
            item.innerHTML = `
                <span class="orcamento-icon">${icon}</span>
                <label for="budget-${category}">${category}</label>
                <div class="orcamento-input-wrapper">
                    <span>R$</span>
                    <input type="text" inputmode="decimal" id="budget-${category}" placeholder="0,00" value="${budgetValue.toString().replace('.', ',')}" data-category="${category}">
                </div>
            `;
            DOM.orcamentoFormContainer.appendChild(item);
        });
    };

    /**
     * Renderiza o progresso dos orçamentos.
     */
    const renderBudgetProgress = () => {
        if (!DOM.orcamentoProgressoContainer) return;

        const { expenseByCategory } = calculateMetrics();
        DOM.orcamentoProgressoContainer.innerHTML = '';

        const budgetedCategories = Object.keys(State.budgets);

        if (budgetedCategories.length === 0) {
            DOM.orcamentoProgressoContainer.innerHTML = '<div class="orcamento-empty-state">Nenhum orçamento definido. Defina limites na seção acima para começar a acompanhar.</div>';
            return;
        }

        budgetedCategories.forEach(category => {
            const budgetLimit = State.budgets[category];
            const spent = expenseByCategory[category] || 0;
            const percentage = (spent / budgetLimit) * 100;
            const remaining = budgetLimit - spent;

            let progressBarClass = '';
            if (percentage > 90) {
                progressBarClass = 'perigo';
            } else if (percentage > 70) {
                progressBarClass = 'aviso';
            }

            const item = document.createElement('div');
            item.className = 'progresso-orcamento-item';
            item.innerHTML = `
                <div class="progresso-orcamento-header">
                    <span>${category}</span>
                    <span class="progresso-orcamento-valores">
                        <span class="gasto">${formatCurrency(spent)}</span> / ${formatCurrency(budgetLimit)}
                    </span>
                </div>
                <div class="progresso-orcamento-barra">
                    <div class="progresso-orcamento-preenchimento ${progressBarClass}" style="width: ${Math.min(percentage, 100)}%;"></div>
                </div>
                <p style="text-align: right; font-size: 0.85rem; margin-top: 5px; color: var(--cor-secundaria);">
                    ${remaining >= 0 ? `${formatCurrency(remaining)} restantes` : `${formatCurrency(Math.abs(remaining))} acima do limite`}
                </p>
            `;
            DOM.orcamentoProgressoContainer.appendChild(item);

            // Alerta proativo
            if (percentage >= 100 && !sessionStorage.getItem(`alert_${category}_${budgetLimit}`)) {
                showNotification(`Atenção: Você atingiu o orçamento para ${category}!`, 'error', 6000);
                sessionStorage.setItem(`alert_${category}_${budgetLimit}`, 'true'); // Evita alertas repetidos na mesma sessão
            }
        });
    };

    const renderMainGoal = () => {
        const placeholder = document.getElementById('main-goal-placeholder');
        if (!placeholder) return;
    
        const { name, target, saved } = State.mainGoal;
    
        const savedAmount = saved || 0;
        const remaining = Math.max(0, target - savedAmount);
        const percentage = target > 0 ? (savedAmount / target) * 100 : (savedAmount > 0 ? 100 : 0);
        const isCompleted = percentage >= 100;
    
        // Constrói o HTML do card dinamicamente
        const icons = {
            mainGoal: `<svg class="card-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v4h-2zm0 6h2v2h-2z" fill="currentColor"/></svg>`
        };

        const cardHTML = /*html*/`
            <div id="conteudo-principal-objetivos" class="meta-card meta-principal ${isCompleted ? 'completed' : ''}">
                <div class="card-header">
                    <h3 id="titulo-do-objetivo-principal">
                        ${icons.mainGoal}
                        ${name}
                    </h3>
                    <button id="btn-definir-meta" class="btn-set-goal" title="Editar Meta">Editar</button>
                </div>
                <div class="savings-progress-container">
                    <div class="savings-progress-bar">
                        <div id="barra-de-progresso-objetivo" class="savings-progress-fill" style="width: ${Math.min(percentage, 100)}%;">
                        </div>
                    </div>
                    <div class="savings-progress-text">
                        <span>Economizado: <span id="valor-guardado">${formatCurrency(savedAmount)}</span></span> <span>Faltam: <span id="valor-da-meta">${formatCurrency(remaining)}</span></span>
                    </div>
                </div>
                <div class="meta-card-footer">
                    <button id="btn-adicionar-fundos-meta-principal" class="btn-add-to-goal">+ Adicionar Dinheiro</button>
                </div>
            </div>
        `;
        placeholder.innerHTML = cardHTML;

        if (isCompleted) {
            placeholder.firstElementChild.classList.add('completed');
        }
    };

    const updateDOM = (options = {}) => {
        renderTransactions(options);
        updateBalance();
        renderFilterSummary();
        renderCharts(); // Atualiza os gráficos junto com o resto da DOM
        renderBudgetProgress(); // Garante que o progresso do orçamento seja sempre atualizado
        renderMainGoal(); // Atualiza a meta principal

        // Separa as metas e investimentos e renderiza em seus respectivos contêineres
        renderTransactionCategoryOptions();
        const metas = State.customGoals.filter(g => g.type === 'meta' || !g.type);
        const investimentos = State.customGoals.filter(g => g.type === 'investimento');
        renderGoalsList(DOM.customMetasList, metas);
        renderGoalsList(DOM.investmentsList, investimentos);
    };

    const openSetGoalModal = () => {
        if (DOM.setGoalModal) {
            DOM.mainGoalNameInput.value = State.mainGoal.name;
            DOM.valorMetaInput.value = State.mainGoal.target > 0 ? State.mainGoal.target.toString().replace('.', ',') : '';
            DOM.setGoalModal.classList.remove('hidden');
            DOM.mainGoalNameInput.focus();
        }
    };

    const saveMainGoal = () => {
        const name = DOM.mainGoalNameInput.value.trim();
        const goalValue = parseFloat(DOM.valorMetaInput.value.replace(',', '.'));

        if (!name) {
            showNotification('O nome da meta não pode estar vazio.', 'error');
            return;
        }

        if (!isNaN(goalValue) && goalValue >= 0) {
            // Mantém o valor 'saved' ao atualizar a meta
            State.mainGoal = { ...State.mainGoal, name: name, target: goalValue };
            saveMainGoalToLocalStorage();
            showNotification('Meta principal salva com sucesso!', 'success');
            if (DOM.setGoalModal) DOM.setGoalModal.classList.add('hidden');
            updateDOM(); // Re-renderiza para mostrar a nova meta
        } else {
            showNotification('Por favor, insira um valor válido para a meta.', 'error');
        }
    };

    const handleGoalActions = (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const card = button.closest('.meta-card');
        if (!card) return;

        const goalId = parseInt(card.dataset.id, 10);
        const action = button.dataset.action;

        if (action === 'adicionar-fundos') {
            openAddToGoalModal(goalId);
        } else if (action === 'editar-meta' || action === 'editar-investimento') {
            openEditCustomGoalModal(goalId);
        }
    };

    const openAddToGoalModal = (goalId) => {
        const goal = State.customGoals.find(g => g.id === goalId);
        if (!goal || !DOM.addToGoalModal) return;

        State.goalActionTargetId = goalId;
        DOM.addToGoalMessage.textContent = `Você está adicionando fundos para a meta "${goal.name}".`;
        DOM.addToGoalValueInput.value = '';
        DOM.addToGoalModal.classList.remove('hidden');
        DOM.addToGoalValueInput.focus();
    };

    const openAddFundsToMainGoalModal = () => {
        if (!DOM.addToGoalModal) return;

        // Usamos 'main' como um ID especial para a meta principal
        State.goalActionTargetId = 'main';
        DOM.addToGoalMessage.textContent = `Você está adicionando fundos para a sua "${State.mainGoal.name}".`;
        DOM.addToGoalValueInput.value = '';
        DOM.addToGoalModal.classList.remove('hidden');
        DOM.addToGoalValueInput.focus();
    };

    const addFundsToGoal = () => {
        const amount = parseFloat(DOM.addToGoalValueInput.value.replace(',', '.'));
        const goalId = State.goalActionTargetId;

        if (isNaN(amount) || amount <= 0) {
            showNotification('Por favor, insira um valor válido.', 'error');
            return;
        }

        let goalName;

        // Lógica para a meta principal
        if (goalId === 'main') {
            goalName = State.mainGoal.name;
            State.mainGoal.saved = (State.mainGoal.saved || 0) + amount;
            saveMainGoalToLocalStorage();
        } else { // Lógica para metas personalizadas (existente)
            const goalIndex = State.customGoals.findIndex(g => g.id === goalId);
            if (goalIndex === -1) {
                showNotification('Meta não encontrada.', 'error');
                return;
            }
            goalName = State.customGoals[goalIndex].name;
            State.customGoals[goalIndex].saved += amount;
            saveCustomGoalsToLocalStorage();
        }

        // Fecha o modal e atualiza a UI
        if (DOM.addToGoalModal) DOM.addToGoalModal.classList.add('hidden');
        showNotification(`Valor de ${formatCurrency(amount)} adicionado à meta!`, 'success');
        updateDOM();
    };

    const deleteCustomGoal = async (goalId) => {
        const goal = State.customGoals.find(g => g.id === goalId);
        if (!goal) return;

        const confirmed = await showConfirmation(`Tem certeza que deseja excluir a meta "${goal.name}"? Esta ação não pode ser desfeita.`);
        if (confirmed) {
            State.customGoals = State.customGoals.filter(g => g.id !== goalId);
            saveCustomGoalsToLocalStorage();
            // Se a exclusão veio do modal, fecha o modal
            if (DOM.createGoalModal && !DOM.createGoalModal.classList.contains('hidden')) {
                DOM.createGoalModal.classList.add('hidden');
            }
            showNotification(`Meta "${goal.name}" excluída.`, 'info');
            updateDOM();
        }
    };


    const openCreateGoalModal = (goalType = 'meta') => {
        if (!DOM.createGoalModal) return;

        State.editingGoalId = null; // Garante que estamos no modo de criação
        State.goalCreationType = goalType; // Armazena o tipo para usar ao salvar

        const modalTitle = DOM.createGoalModal.querySelector('h3');
        const modalSubtitle = DOM.createGoalModal.querySelector('p');
        const goalNameLabel = DOM.createGoalModal.querySelector('label[for="goal-name"]');

        DOM.goalSavedValueGroup.classList.add('hidden'); // Esconde o campo de valor salvo na criação
        if (goalType === 'investimento') {
            modalTitle.textContent = 'Criar Novo Investimento';
            modalSubtitle.textContent = 'Defina um objetivo de investimento e o valor que você precisa alcançar.';
            goalNameLabel.textContent = 'Nome do Investimento';
            DOM.goalNameInput.placeholder = 'Ex: Ações da Empresa X';
            DOM.createGoalBtnOk.textContent = 'Salvar Investimento';
            DOM.goalCategoryGroup.classList.remove('hidden');
            renderCategoryOptions(); // Popula com as categorias padrão
            DOM.goalCategoryOtherInput.classList.add('hidden');
        } else { // Padrão para 'meta'
            modalTitle.textContent = 'Criar Nova Meta Financeira';
            modalSubtitle.textContent = 'Defina um objetivo e o valor que você precisa economizar.';
            goalNameLabel.textContent = 'Nome da Meta';
            DOM.goalNameInput.placeholder = 'Ex: Viagem para a praia';
            DOM.createGoalBtnOk.textContent = 'Salvar Meta';
            DOM.goalCategoryGroup.classList.add('hidden');
        }

        DOM.goalNameInput.value = '';
        document.getElementById('delete-goal-from-modal-btn').classList.add('hidden');
        DOM.goalTargetValueInput.value = '';
        DOM.createGoalModal.classList.remove('hidden');
        DOM.goalNameInput.focus();
    };
    const openEditCustomGoalModal = (goalId) => {
        if (!DOM.createGoalModal) return;

        const goal = State.customGoals.find(g => g.id === goalId);
        if (!goal) return;

        State.editingGoalId = goalId; // Define o modo de edição

        const modalTitle = DOM.createGoalModal.querySelector('h3');
        const goalNameLabel = DOM.createGoalModal.querySelector('label[for="goal-name"]');

        // Adapta o modal de edição com base no tipo da meta (se existir)
        if (goal.type === 'investimento') {
            modalTitle.textContent = 'Editar Investimento';
            goalNameLabel.textContent = 'Nome do Investimento';
            DOM.goalCategoryGroup.classList.remove('hidden');
            renderCategoryOptions(goal.category); // Popula e seleciona a categoria correta
        } else {
            modalTitle.textContent = 'Editar Meta';
            goalNameLabel.textContent = 'Nome da Meta';
            DOM.goalCategoryGroup.classList.add('hidden');
        }

        DOM.createGoalBtnOk.textContent = 'Salvar Alterações';
        DOM.goalNameInput.value = goal.name;

        const deleteBtn = document.getElementById('delete-goal-from-modal-btn');
        deleteBtn.classList.remove('hidden');
        deleteBtn.onclick = () => {
            deleteCustomGoal(goalId);
        };

        // Exibe e preenche o campo de valor salvo
        DOM.goalSavedValueGroup.classList.remove('hidden');
        DOM.goalSavedValueInput.value = (goal.saved || 0).toString().replace('.', ',');
        // Limpa o campo de "outra categoria" para evitar confusão
        DOM.goalCategoryOtherInput.value = '';

        DOM.goalTargetValueInput.value = goal.target.toString().replace('.', ',');
        DOM.createGoalModal.classList.remove('hidden');
        DOM.goalNameInput.focus();
    };

    const saveCustomGoal = () => {
        const name = DOM.goalNameInput.value.trim();
        const targetValue = parseFloat(DOM.goalTargetValueInput.value.replace(',', '.'));
        const savedValue = parseFloat(DOM.goalSavedValueInput.value.replace(',', '.')) || 0;

        if (!name || isNaN(targetValue) || targetValue <= 0) {
            showNotification('Por favor, preencha um nome e um valor alvo válido.', 'error');
            return;
        }

        if (State.editingGoalId) {
            // Modo de Edição
            const goalIndex = State.customGoals.findIndex(g => g.id === State.editingGoalId);
            if (goalIndex > -1) {
                State.customGoals[goalIndex].name = name;
                State.customGoals[goalIndex].target = targetValue;
                State.customGoals[goalIndex].saved = savedValue;

                // Se for um investimento, atualiza a categoria
                if (State.customGoals[goalIndex].type === 'investimento') {
                    let category = DOM.goalCategorySelect.value;
                    if (category === 'Outra') {
                        const newCategory = DOM.goalCategoryOtherInput.value.trim();
                        if (newCategory) {
                            category = newCategory.charAt(0).toUpperCase() + newCategory.slice(1);
                            if (!State.investmentCategories.includes(category)) {
                                State.investmentCategories.push(category);
                                saveInvestmentCategoriesToLocalStorage();
                            }
                        } else {
                            showNotification('Por favor, especifique a nova categoria de investimento.', 'error');
                            return;
                        }
                    }
                    State.customGoals[goalIndex].category = category;
                }
                showNotification(`Ativo "${name}" atualizado com sucesso!`, 'success');
            }
        } else {
            // Modo de Criação
            const newGoal = {
                id: Date.now(),
                name: name,
                target: targetValue,
                saved: 0,
                type: State.goalCreationType || 'meta', // Salva o tipo da meta
            };

            // Se for um investimento, define a categoria
            if (newGoal.type === 'investimento') {
                let category = DOM.goalCategorySelect.value;
                if (category === 'Outra') {
                    const newCategory = DOM.goalCategoryOtherInput.value.trim();
                    if (newCategory) {
                        category = newCategory.charAt(0).toUpperCase() + newCategory.slice(1);
                        if (!State.investmentCategories.includes(category)) {
                            State.investmentCategories.push(category);
                            saveInvestmentCategoriesToLocalStorage();
                        }
                    }
                }
                newGoal.category = category || 'Sem Categoria';
            }

            State.customGoals.push(newGoal);
            const typeText = newGoal.type === 'investimento' ? 'Investimento' : 'Meta';
            showNotification(`${typeText} "${name}" criado com sucesso!`, 'success');
        }

        saveCustomGoalsToLocalStorage();
        if (DOM.createGoalModal) DOM.createGoalModal.classList.add('hidden');
        updateDOM(); // Re-renderiza a UI para mostrar a nova meta
        resetFormState(); // Limpa o formulário principal também
    };

    const setValuesVisibility = (isVisible) => {
        State.valuesVisible = isVisible;
    };

    const openResetGoalsModal = () => {
        if (!DOM.resetGoalsModal || !DOM.resetGoalsList) return;

        DOM.resetGoalsList.innerHTML = ''; // Limpa a lista anterior

        // Adiciona a meta principal à lista de seleção
        const mainGoalHTML = `
            <label>
                <input type="checkbox" name="goal_to_reset" value="main">
                <span>🎯 ${State.mainGoal.name} (Principal)</span>
            </label>
        `;
        DOM.resetGoalsList.insertAdjacentHTML('beforeend', mainGoalHTML);

        // Adiciona as metas personalizadas
        State.customGoals.forEach(goal => {
            const customGoalHTML = `
                <label>
                    <input type="checkbox" name="goal_to_reset" value="${goal.id}">
                    <span>${goal.type === 'investimento' ? '💡' : '🎯'} ${goal.name}</span>
                </label>
            `;
            DOM.resetGoalsList.insertAdjacentHTML('beforeend', customGoalHTML);
        });

        DOM.resetGoalsModal.classList.remove('hidden');
    };

    const resetSelectedGoals = () => {
        const selectedGoals = document.querySelectorAll('input[name="goal_to_reset"]:checked');
        if (selectedGoals.length === 0) {
            showNotification('Nenhuma meta foi selecionada para resetar.', 'info');
            return;
        }

        selectedGoals.forEach(checkbox => {
            const goalId = checkbox.value;
            if (goalId === 'main') {
                State.mainGoal.saved = 0;
            } else {
                const goal = State.customGoals.find(g => g.id === parseInt(goalId, 10));
                if (goal) goal.saved = 0;
            }
        });

        saveMainGoalToLocalStorage();
        saveCustomGoalsToLocalStorage();
        DOM.resetGoalsModal.classList.add('hidden');
        showNotification('Progresso das metas selecionadas foi resetado.', 'success');
        updateDOM();
    };

    /**
     * Renderiza as opções de categoria de investimento no select do modal.
     * @param {string} [selectedCategory] - A categoria a ser pré-selecionada.
     */
    const renderCategoryOptions = (selectedCategory) => {
        if (!DOM.goalCategorySelect) return;

        DOM.goalCategorySelect.innerHTML = ''; // Limpa as opções

        State.investmentCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            DOM.goalCategorySelect.appendChild(option);
        });

        const otherOption = document.createElement('option');
        otherOption.value = 'Outra';
        otherOption.textContent = 'Outra...';
        DOM.goalCategorySelect.appendChild(otherOption);

        DOM.goalCategorySelect.value = selectedCategory || State.investmentCategories[0];
    };

    /**
     * Lida com o início do arraste de um card de investimento.
     */
    const handleDragStart = (e) => {
        const card = e.target.closest('.meta-card');
        if (!card) return;
        State.draggedItemId = parseInt(card.dataset.id, 10);
        // Adiciona um pequeno delay para o navegador "pegar" o elemento
        setTimeout(() => card.classList.add('dragging'), 0);
    };

    /**
     * Lida com o fim do arraste (quando o item é solto).
     */
    const handleDragEnd = (e) => {
        const card = e.target.closest('.meta-card');
        if (card) card.classList.remove('dragging');
        // Limpa as classes de 'drag-over' de todos os cards
        document.querySelectorAll('.meta-card.drag-over').forEach(c => c.classList.remove('drag-over'));
        State.draggedItemId = null;
    };

    /**
     * Previne o comportamento padrão para permitir o 'drop'.
     */
    const handleDragOver = (e) => {
        e.preventDefault();
        const targetCard = e.target.closest('.meta-card');
        if (!targetCard || parseInt(targetCard.dataset.id, 10) === State.draggedItemId) return;

        // Remove a classe de todos os outros para ter apenas um indicador
        document.querySelectorAll('.meta-card.drag-over').forEach(c => c.classList.remove('drag-over'));
        targetCard.classList.add('drag-over');
    };

    /**
     * Lida com o evento de soltar o card.
     */
    const handleDrop = (e) => {
        e.preventDefault();
        const dropTargetCard = e.target.closest('.meta-card');
        if (!dropTargetCard || !State.draggedItemId) return;

        const draggedId = State.draggedItemId;
        const targetId = parseInt(dropTargetCard.dataset.id, 10);

        const draggedIndex = State.customGoals.findIndex(g => g.id === draggedId);
        const targetIndex = State.customGoals.findIndex(g => g.id === targetId);

        if (draggedIndex > -1 && targetIndex > -1) {
            // Remove o item arrastado e o insere antes do item alvo
            const [draggedItem] = State.customGoals.splice(draggedIndex, 1);
            // Recalcula o targetIndex após a remoção, pois o array mudou
            const newTargetIndex = State.customGoals.findIndex(g => g.id === targetId);
            State.customGoals.splice(newTargetIndex >= 0 ? newTargetIndex : targetIndex, 0, draggedItem);

            saveCustomGoalsToLocalStorage();
            updateDOM(); // Re-renderiza a lista na nova ordem
        }
    };

    // Funções de formulário refatoradas para serem chamadas pelo orquestrador
    const addTransaction = (e) => {
        e.preventDefault();
        const form = e.target;
        const valorInput = form.querySelector('#valor');
        const descricaoInput = form.querySelector('#descricao');
        const categoriaInput = form.querySelector('#categoria');
        const categoriaOutraInput = form.querySelector('#categoria-outra');

        const valor = parseFloat(valorInput.value.replace(',', '.'));
        const tipo = form.querySelector('input[name="tipo"]:checked').value;

        let pagamento = 'N/A';
        if (tipo === 'despesa') {
            const pagamentoRadio = form.querySelector('input[name="forma_pagamento"]:checked');
            pagamento = pagamentoRadio ? pagamentoRadio.value : 'debito';
        }

        const descricao = descricaoInput.value.trim();
        let categoria = categoriaInput.value;

        if (categoria === 'Outra') {
            const novaCategoria = categoriaOutraInput.value.trim();
            if (novaCategoria) {
                categoria = novaCategoria.charAt(0).toUpperCase() + novaCategoria.slice(1);
                if (!State.transactionCategories.includes(categoria)) {
                    State.transactionCategories.push(categoria);
                    saveTransactionCategoriesToLocalStorage();
                }
            } else {
                showNotification('Por favor, especifique o nome da nova categoria.', 'error');
                return;
            }
        }

        if (descricao === '' || isNaN(valor) || valor <= 0) {
            showNotification('Por favor, preencha a descrição e um valor válido.', 'error');
            return;
        }

        let transactionIdToHighlight;

        if (State.editingId) {
            const transactionIndex = State.transactions.findIndex(t => t.id === State.editingId);
            if (transactionIndex > -1) {
                const originalTransaction = State.transactions[transactionIndex];
                State.transactions[transactionIndex] = {
                    ...originalTransaction,
                    descricao, valor, categoria, tipo,
                    pagamento: (tipo === 'receita') ? 'N/A' : pagamento,
                };
                transactionIdToHighlight = State.editingId;
                showNotification('Transação atualizada com sucesso!', 'success');
            }
        } else {
            const newTransaction = {
                id: Date.now(),
                descricao, valor, categoria, tipo,
                pagamento: (tipo === 'receita') ? 'N/A' : pagamento,
                data: new Date().toISOString()
            };
            transactionIdToHighlight = newTransaction.id;
            State.transactions.unshift(newTransaction);
            showNotification('Transação adicionada com sucesso!', 'success');
        }

        saveToLocalStorage();
        updateDOM({ highlightId: transactionIdToHighlight });
        resetFormState();
        if (categoriaOutraInput) categoriaOutraInput.classList.add('hidden');
        DOM.addTransactionModal.classList.add('hidden');
    };

    const populateFormForEdit = (transactionData) => {
        const transaction = State.transactions.find(t => t.id === transactionData.id);
        if (!transaction) return;

        const form = document.querySelector('#add-transaction-modal #formTransacao');
        if (!form) return;

        State.editingId = transaction.id;
        form.querySelector('#descricao').value = transaction.descricao;
        form.querySelector('#valor').value = transaction.valor.toString().replace('.', ',');
        const categoriaSelect = form.querySelector('#categoria');
        categoriaSelect.value = transaction.categoria;

        const tipoRadio = form.querySelector(`input[name="tipo"][value="${transaction.tipo}"]`);
        if (tipoRadio) tipoRadio.checked = true;

        const isExpense = transaction.tipo === 'despesa';
        const pagamentoFieldset = form.querySelector('#forma-pagamento-fieldset');
        if (pagamentoFieldset) pagamentoFieldset.style.display = isExpense ? 'block' : 'none';

        if (isExpense && transaction.pagamento !== 'N/A') {
            const pagamentoRadio = form.querySelector(`input[name="forma_pagamento"][value="${transaction.pagamento}"]`);
            if (pagamentoRadio) pagamentoRadio.checked = true;
        }

        categoriaSelect.dispatchEvent(new Event('change'));
        form.querySelector('#addTransactionBtn').textContent = 'Atualizar Transação';
        form.querySelector('#cancelEditBtn').classList.remove('hidden');
        form.querySelector('#descricao').focus();
        DOM.addTransactionModal.classList.remove('hidden');
    };

    const resetFormState = () => {
        const form = document.querySelector('#add-transaction-modal #formTransacao');
        if (!form) return;

        State.editingId = null;
        form.reset();

        form.querySelector('#addTransactionBtn').textContent = 'Adicionar Transação';
        form.querySelector('#cancelEditBtn').classList.add('hidden');

        const tipoRadios = form.querySelectorAll('input[name="tipo"]');
        tipoRadios.forEach(radio => {
            radio.disabled = false;
            if (radio.parentElement) radio.parentElement.classList.remove('disabled');
        });
        const formaPagamentoRadios = form.querySelectorAll('input[name="forma_pagamento"]');
        formaPagamentoRadios.forEach(radio => {
            radio.disabled = false;
            if (radio.parentElement) radio.parentElement.classList.remove('disabled');
        });
        form.querySelector('#descricao').focus();
    };

    const handleBudgetChange = (e) => {
        const category = e.target.dataset.category;
        const value = parseFloat(e.target.value.replace(',', '.'));

        if (!isNaN(value) && value > 0) {
            State.budgets[category] = value;
            showNotification(`Orçamento para ${category} salvo.`, 'info');
        } else {
            delete State.budgets[category];
            showNotification(`Orçamento para ${category} removido.`, 'info');
        }
        saveBudgetsToLocalStorage();
        renderBudgetProgress();
    };

    return {
        init: () => {
            renderTransactionCategoryOptions();
            renderBudgetForms();
        },
        updateDOM,
        setFilter, // Expõe a nova função de filtro
        showAllTransactions, // Expõe a nova função
        renderCharts, // Expõe a função de renderizar gráficos
        setValuesVisibility, // Expõe a nova função para controlar a visibilidade
        openSetGoalModal,
        saveMainGoal,
        openAddFundsToMainGoalModal,
        openCreateGoalModal,
        saveCustomGoal,
        openCategoryManager,
        addNewCategoryFromManager,
        handleCategoryActions,
        renderTransactionCategoryOptions,
        handleGoalActions,
        addFundsToGoal,
        openResetGoalsModal,
        resetSelectedGoals,
        // Funções que precisam ser expostas para o orquestrador
        addTransaction,
        populateFormForEdit,
        resetFormState,
        deleteTransaction,
        handleBudgetChange,
        clearAllTransactions,
        exportTransactionsToHTML,
        exportTransactionsToCSV,
        payCreditCardBill,
    };
}
