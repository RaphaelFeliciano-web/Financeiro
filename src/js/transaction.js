function createTransactionManager(DOM) {
    const State = {
        transactions: JSON.parse(localStorage.getItem('transactions')) || [],
        editingId: null,
        isConfirmationVisible: false,
        currentFilter: 'all',
        showingAll: false, // Controla se todas as transações são exibidas
        filterSummaryRequested: false, // Controla a visibilidade do resumo do filtro
        charts: { despesas: null, receitas: null, saldoEvolucao: null }, // Armazena instâncias dos gráficos
    };

    /**
     * Formata um número para a moeda BRL.
     */
    const formatCurrency = (value) => {
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
     * Salva as transações no Local Storage, garantindo a persistência dos dados.
     */
    const saveToLocalStorage = () => {
        localStorage.setItem('transactions', JSON.stringify(State.transactions));
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

            li.classList.add(transaction.tipo);
            li.dataset.id = transaction.id;

            clone.querySelector('.col-data').textContent = formatDateTime(transaction.data);
            clone.querySelector('.col-descricao').textContent = transaction.descricao;
            clone.querySelector('.col-categoria').textContent = transaction.categoria;
            clone.querySelector('.col-pagamento').textContent = transaction.pagamento;

            const valorPrefix = transaction.tipo === 'receita' ? '+ ' : '- ';
            clone.querySelector('.col-valor').textContent = valorPrefix + formatCurrency(transaction.valor);

            deleteBtn.dataset.id = transaction.id;
            editBtn.dataset.id = transaction.id;

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

        const metrics = State.transactions.reduce((acc, t) => {
            if (t.tipo === 'receita') {
                acc.receitas += t.valor;
                incomeByCategory[t.categoria] = (incomeByCategory[t.categoria] || 0) + t.valor;
            } else if (t.tipo === 'despesa') {
                acc.totalDespesas += t.valor;
                if (t.pagamento === 'credito') {
                    acc.gastosNoCredito += t.valor;
                } else {
                    acc.despesasEmConta += t.valor; // Inclui débito, pix, etc.
                    if (t.pagamento === 'debito') acc.totalGastoDebito += t.valor;
                    if (t.pagamento === 'pix') acc.totalGastoPix += t.valor;
                }

                // Acumula gastos por categoria, ignorando "Pagamento de Fatura"
                if (t.categoria !== 'Pagamento de Fatura') {
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
            // Cria uma chave no formato 'YYYY-MM' para garantir a ordem cronológica
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
        const { saldoFinal, dividaFinal } = calculateMetrics();
        if (DOM.saldoAtual) DOM.saldoAtual.textContent = formatCurrency(saldoFinal);
        if (DOM.dividaCartao) DOM.dividaCartao.textContent = formatCurrency(dividaFinal);

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
     * Reseta o formulário e o estado de edição.
     */
    const resetFormState = () => {
        State.editingId = null;
        if (DOM.formTransacao) DOM.formTransacao.reset();
        if (DOM.addTransactionBtn) DOM.addTransactionBtn.textContent = 'Adicionar Transação';
        if (DOM.cancelEditBtn) DOM.cancelEditBtn.classList.add('hidden');
        
        if (DOM.tipoRadios) DOM.tipoRadios.forEach(radio => {
            radio.disabled = false;
            if (radio.parentElement) radio.parentElement.classList.remove('disabled');
        });
        if (DOM.formaPagamentoRadios) DOM.formaPagamentoRadios.forEach(radio => {
            radio.disabled = false;
            if (radio.parentElement) radio.parentElement.classList.remove('disabled');
        });
        if (DOM.descricaoInput) DOM.descricaoInput.focus();
    };

    /**
     * Preenche o formulário para editar uma transação.
     */
    const populateFormForEdit = (transaction) => {
        State.editingId = transaction.id;
        DOM.descricaoInput.value = transaction.descricao;
        DOM.valorInput.value = transaction.valor.toString().replace('.', ',');
        DOM.categoriaInput.value = transaction.categoria;

        const tipoRadio = document.querySelector(`input[name="tipo"][value="${transaction.tipo}"]`);
        if (tipoRadio) tipoRadio.checked = true;
        
        if (transaction.tipo === 'despesa' && transaction.pagamento !== 'N/A') {
            const pagamentoRadio = document.querySelector(`input[name="forma_pagamento"][value="${transaction.pagamento}"]`);
            if (pagamentoRadio) pagamentoRadio.checked = true;
        }

        if (DOM.categoriaInput) DOM.categoriaInput.dispatchEvent(new Event('change'));
        if (DOM.addTransactionBtn) DOM.addTransactionBtn.textContent = 'Atualizar Transação';
        if (DOM.cancelEditBtn) DOM.cancelEditBtn.classList.remove('hidden');
        if (DOM.descricaoInput) DOM.descricaoInput.focus();
        if (DOM.formTransacao) DOM.formTransacao.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    /**
     * Adiciona ou atualiza uma transação.
     */
    const addTransaction = (e) => {
        e.preventDefault();

        const valor = parseFloat(DOM.valorInput.value.replace(',', '.'));
        let tipo = document.querySelector('input[name="tipo"]:checked').value;
        const pagamento = document.querySelector('input[name="forma_pagamento"]:checked').value;
        const descricao = DOM.descricaoInput.value.trim();
        const categoria = DOM.categoriaInput.value;

        if (descricao === '' || isNaN(valor) || valor <= 0) {
            showNotification('Por favor, preencha a descrição e um valor válido.', 'error');
            return;
        }

        // --- Validação de Saldo ---
        // Garante que a transação não resultará em saldo negativo na conta.
        const { saldoFinal } = calculateMetrics();
        let potentialNewBalance = saldoFinal;

        if (State.editingId) {
            const originalTransaction = State.transactions.find(t => t.id === State.editingId);
            if (originalTransaction) {
                // Reverte o efeito da transação original no saldo da conta
                if (originalTransaction.tipo === 'receita') {
                    potentialNewBalance -= originalTransaction.valor;
                } else if (originalTransaction.pagamento !== 'credito') {
                    potentialNewBalance += originalTransaction.valor;
                }
            }
        }

        // Aplica o efeito da nova transação (ou da transação editada) no saldo da conta
        if (tipo === 'receita') {
            // Ao editar uma despesa para receita, o valor é adicionado.
            // Ao adicionar uma nova receita, o valor é adicionado.
            potentialNewBalance += valor;
        } else if (pagamento !== 'credito') {
            potentialNewBalance -= valor;
        }

        // Verifica se a operação é válida
        if (potentialNewBalance < 0) {
            const message = State.editingId
                ? 'A atualização desta transação deixaria seu saldo negativo.'
                : 'Saldo insuficiente para esta despesa.';
            showNotification(message, 'error');
            return;
        }
        // --- Fim da Validação de Saldo ---

        if (categoria === 'Pagamento de Fatura') {
            tipo = 'despesa';
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
    };

    /**
     * Remove uma transação pelo ID.
     */
    const deleteTransaction = async (id) => {
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
    const clearAllTransactions = async () => {
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
    
        const summaryHTML = `
            <div class="analise-resumo-item">
                <h4>Total de Receitas</h4>
                <p class="receita">${formatCurrency(receitas)}</p>
            </div>
            <div class="analise-resumo-item">
                <h4>Total de Despesas</h4>
                <p class="despesa">${formatCurrency(totalDespesas)}</p>
            </div>
            <div class="analise-resumo-item">
                <h4>Balanço do Período</h4>
                <p class="${netBalance >= 0 ? 'receita' : 'despesa'}">${formatCurrency(netBalance)}</p>
            </div>
            <div class="analise-resumo-item health-status-card">
                <h4>Sua Saúde Financeira</h4>
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
                listHTML += `
                    <div class="lista-detalhada-item">
                        <span class="lista-detalhada-cor" style="background-color: ${color};"></span>
                        <span class="lista-detalhada-categoria">${category}</span>
                        <span class="lista-detalhada-valor">${formatCurrency(value)}</span>
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
                listHTML += `
                    <div class="lista-detalhada-item receita">
                        <span class="lista-detalhada-cor" style="background-color: ${color};"></span>
                        <span class="lista-detalhada-categoria">${category}</span>
                        <span class="lista-detalhada-valor">${formatCurrency(value)}</span>
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
        if (!DOM.despesasChart || !DOM.receitasChart || !DOM.saldoEvolucaoChart) return; // Safety check

        const metrics = calculateMetrics();
        const chartFontColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#e0e0e0' : '#333';
        Chart.defaults.color = chartFontColor;

        renderAnalysisSummary(metrics);
        renderExpenseChart(metrics, chartFontColor);
        renderIncomeChart(metrics, chartFontColor);
        renderBalanceChart(metrics, chartFontColor);
    };

    const updateDOM = (options = {}) => {
        renderTransactions(options);
        updateBalance();
        renderFilterSummary();
        renderCharts(); // Atualiza os gráficos junto com o resto da DOM
    };

    const init = () => {
        // Safely adds listeners, ensuring the absence of an element does not break the application
        if (DOM.formTransacao) DOM.formTransacao.addEventListener('submit', addTransaction);
        if (DOM.cancelEditBtn) DOM.cancelEditBtn.addEventListener('click', resetFormState);
        if (DOM.btnLimparTudo) DOM.btnLimparTudo.addEventListener('click', clearAllTransactions);
        if (DOM.payBillBtnOk) DOM.payBillBtnOk.addEventListener('click', payCreditCardBill);
        if (DOM.btnExportar) DOM.btnExportar.addEventListener('click', exportTransactionsToHTML);
        if (DOM.btnExportarCSV) DOM.btnExportarCSV.addEventListener('click', exportTransactionsToCSV);

        document.addEventListener('click', handleClickOutside);

        if (DOM.categoriaInput) {
            DOM.categoriaInput.addEventListener('change', () => {
                const isFatura = DOM.categoriaInput.value === 'Pagamento de Fatura';
                const radios = [...(DOM.tipoRadios || []), ...(DOM.formaPagamentoRadios || [])];

                if (isFatura) {
                    const despesaRadio = document.querySelector('input[name="tipo"][value="despesa"]');
                    const debitoRadio = document.querySelector('input[name="forma_pagamento"][value="debito"]');
                    if (despesaRadio) despesaRadio.checked = true;
                    if (debitoRadio) debitoRadio.checked = true;
                }

                radios.forEach(radio => {
                    if (radio && radio.parentElement) {
                        radio.disabled = isFatura;
                        radio.parentElement.classList.toggle('disabled', isFatura);
                    }
                });
            });
        }

        if (DOM.transacoesLista) {
            DOM.transacoesLista.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (!button) return;

                const id = parseInt(button.dataset.id);
                if (isNaN(id)) return;

                if (button.classList.contains('delete-btn')) {
                    deleteTransaction(id);
                } else if (button.classList.contains('edit-btn')) {
                    const transactionToEdit = State.transactions.find(t => t.id === id);
                    if (transactionToEdit) {
                        populateFormForEdit(transactionToEdit);
                    }
                }
            });
        }
    };

    return {
        init,
        updateDOM,
        setFilter, // Expõe a nova função de filtro
        showAllTransactions, // Expõe a nova função
        renderCharts, // Expõe a função de renderizar gráficos
    };
}
