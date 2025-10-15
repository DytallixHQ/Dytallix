# Manual Fix for Balance Doubling Bug

## Problem
All genesis account balances are exactly 2x the intended amounts because old database balances persist when loading a new genesis file.

## Root Cause
When `set_balance()` is called during genesis loading, it calls `get_account()` which loads any existing balance from the database. The genesis then "sets" the balance on top of the old one, effectively doubling it.

## Solution
Clear the in-memory account cache before loading genesis to force fresh account creation.

---

## Manual Fix Instructions

### File 1: `src/state/mod.rs`

Add this method to the `impl State` block (after the `get_account` method):

```rust
    /// Clear the in-memory account cache
    /// This is called before loading genesis to prevent loading stale balances from the database
    pub fn clear_account_cache(&mut self) {
        self.accounts.clear();
    }
```

**Location**: Around line 90-95, right after the `get_account` method ends.

---

### File 2: `src/main.rs`

Add the `clear_account_cache()` call in the genesis loading section:

Find this code (around line 135-140):
```rust
    if let Some(accounts) = genesis.get("accounts").and_then(|v| v.as_array()) {
        let mut st = state.lock().unwrap();
        
        for acc in accounts {
```

Change it to:
```rust
    if let Some(accounts) = genesis.get("accounts").and_then(|v| v.as_array()) {
        let mut st = state.lock().unwrap();
        
        // CRITICAL FIX: Clear the in-memory account cache before loading genesis
        // This prevents loading old balances from the database when set_balance calls get_account
        st.clear_account_cache();
        
        for acc in accounts {
```

---

## Build and Deploy

```bash
# On the server at /opt/dytallix-fast-launch-server-node
cargo build --release

# The fixed binary will be at:
# target/release/dytallix-fast-node

# Deploy using the orchestrator
cd /opt/dytallix-fast-launch
./orchestrator/deploy.sh
```

---

## Verification

After deploying, verify the fix worked:

```bash
# Check faucet balance (should be 100,000,000 DGT, not 200,000,000)
curl https://dytallix.com/rpc/account/pqc1ml3mzl0g33glytxxqgvqnvwe8nzkgmpqhcn0vfjsqm6f7x59kzdnhqqv48drtc4wrvezrsgwmh9kzssqj3xj47jnnuq9u9vvwxrq8ns5z2hq2

# Check treasury balance (should be 400,000,000 DGT, not 800,000,000)
curl https://dytallix.com/rpc/account/pqc1ml3mzl0g33glytxxqgvqnvwe8nzkgmpqhcn0vfjsqm6f7x59kzdnhqqv48drtc4wrvezrsgwmh9kzssqj3xj47jnnuq9u9vvwxrqapvfzsq
```

All balances should now match the genesis.json file exactly (not doubled).

---

## What This Fixes

✅ Genesis accounts now have correct balances  
✅ Future genesis files will work correctly  
✅ No need to halve amounts in genesis files  
✅ Chain state matches genesis specification  
✅ No technical debt or workarounds needed  

---

## Rollback (if needed)

If something goes wrong, the orchestrator/deploy.sh script will have a backup of the previous binary. You can also restore from the `.backup` files created by the fix script.
